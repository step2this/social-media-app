import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { GetCommand, UpdateCommand, QueryCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import {
  S3Client,
  PutObjectCommand,
  type PutObjectCommandInput
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  Profile,
  PublicProfile,
  UpdateProfileWithHandleRequest,
  GetPresignedUrlRequest,
  GetPresignedUrlResponse
} from '@social-media-app/shared';
import { randomUUID } from 'crypto';
import {
  type UserProfileEntity,
  mapEntityToProfile,
  mapEntityToPublicProfile
} from '../entities/user-profile.entity.js';
import { buildUpdateExpressionFromObject } from '../utils/update-expression-builder.js';
import {
  buildProfileUpdateData,
  isGSI3ValidationError
} from '../utils/profile-update-helpers.js';
import { getS3BaseUrl } from '../utils/environment-config.js';

/**
 * Profile service for managing user profiles
 */
export class ProfileService {
  private readonly tableName: string;
  private readonly s3BucketName: string;
  private readonly s3Client: S3Client;
  private readonly cloudFrontDomain?: string;

  constructor(
    private readonly dynamoClient: DynamoDBDocumentClient,
    tableName: string,
    s3BucketName?: string,
    cloudFrontDomain?: string,
    s3Client?: S3Client
  ) {
    this.tableName = tableName;
    this.s3BucketName = s3BucketName || process.env.MEDIA_BUCKET_NAME || '';
    this.cloudFrontDomain = cloudFrontDomain || process.env.CLOUDFRONT_DOMAIN;

    // Create S3 client with environment-aware configuration if not provided
    if (s3Client) {
      this.s3Client = s3Client;
    } else {
      this.s3Client = this.createS3Client();
    }
  }

  /**
   * Creates S3 client with environment-specific configuration
   * Private helper for S3 client initialization
   */
  private createS3Client(): S3Client {
    const isLocalStackEnv = (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') &&
                            process.env.USE_LOCALSTACK === 'true';

    const s3Config: any = {
      region: process.env.AWS_REGION || 'us-east-1'
    };

    if (isLocalStackEnv) {
      s3Config.endpoint = process.env.LOCALSTACK_ENDPOINT || 'http://localhost:4566';
      s3Config.forcePathStyle = true;
      // For LocalStack compatibility, disable automatic checksum calculation
      s3Config.requestChecksumCalculation = 'WHEN_REQUIRED';
      s3Config.responseChecksumValidation = 'WHEN_REQUIRED';
    }

    return new S3Client(s3Config);
  }

  /**
   * Get profile by user ID
   */
  async getProfileById(userId: string): Promise<Profile | null> {
    const result = await this.dynamoClient.send(new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE'
      }
    }));

    return result.Item ? mapEntityToProfile(result.Item as UserProfileEntity) : null;
  }

  /**
   * Batch fetch multiple profiles by user IDs
   * Optimized for DataLoader batching to solve N+1 query problem
   *
   * @param userIds - Array of user IDs to fetch (max 100 per DynamoDB limits)
   * @returns Map of userId to PublicProfile for DataLoader compatibility
   *
   * @example
   * ```typescript
   * const profiles = await profileService.getProfilesByIds(['user1', 'user2', 'user3']);
   * const user1Profile = profiles.get('user1'); // PublicProfile or undefined
   * ```
   */
  async getProfilesByIds(userIds: string[]): Promise<Map<string, PublicProfile>> {
    const profileMap = new Map<string, PublicProfile>();

    // Return empty map if no IDs provided
    if (userIds.length === 0) {
      return profileMap;
    }

    // DynamoDB BatchGetItem has a limit of 100 items per request
    const batchSize = 100;
    const batches: string[][] = [];

    // Split into batches of 100
    for (let i = 0; i < userIds.length; i += batchSize) {
      batches.push(userIds.slice(i, i + batchSize));
    }

    // Process each batch
    for (const batch of batches) {
      // Build keys for batch request
      const keys = batch.map(userId => ({
        PK: `USER#${userId}`,
        SK: 'PROFILE'
      }));

      const result = await this.dynamoClient.send(new BatchGetCommand({
        RequestItems: {
          [this.tableName]: {
            Keys: keys
          }
        }
      }));

      // Process responses
      if (result.Responses && result.Responses[this.tableName]) {
        for (const item of result.Responses[this.tableName]) {
          const entity = item as UserProfileEntity;
          const publicProfile = mapEntityToPublicProfile(entity);
          profileMap.set(entity.id, publicProfile);
        }
      }

      // Handle unprocessed keys (usually due to throttling)
      if (result.UnprocessedKeys && result.UnprocessedKeys[this.tableName]) {
        // In production, you might want to implement retry logic here
        console.warn(`Unprocessed keys in ProfileService.getProfilesByIds:`,
          result.UnprocessedKeys[this.tableName].Keys?.length);
      }
    }

    return profileMap;
  }

  /**
   * Get public profile by handle
   */
  async getProfileByHandle(handle: string): Promise<PublicProfile | null> {
    const result = await this.dynamoClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'GSI3',
      KeyConditionExpression: 'GSI3PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `HANDLE#${handle.toLowerCase()}`
      },
      Limit: 1
    }));

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    const entity = result.Items[0] as UserProfileEntity;
    return mapEntityToPublicProfile(entity);
  }

  /**
   * Check if handle is available
   */
  async isHandleAvailable(handle: string, excludeUserId?: string): Promise<boolean> {
    try {
      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI3',
        KeyConditionExpression: 'GSI3PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `HANDLE#${handle.toLowerCase()}`
        },
        Limit: 1
      }));

      if (!result.Items || result.Items.length === 0) {
        return true;
      }

      // If excludeUserId is provided, check if the handle belongs to that user
      if (excludeUserId) {
        const entity = result.Items[0] as UserProfileEntity;
        return entity.id === excludeUserId;
      }

      return false;
    } catch (error: any) {
      // If GSI3 doesn't exist (likely in LocalStack), allow the handle for now
      if (error.name === 'ValidationException' && error.message.includes('Index not found')) {
        console.warn('GSI3 index not found - allowing handle update without uniqueness check');
        return true;
      }
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: UpdateProfileWithHandleRequest
  ): Promise<Profile> {
    // Check handle availability if handle update is requested
    let gsi3Available = true;

    if (updates.handle !== undefined) {
      try {
        const isAvailable = await this.isHandleAvailable(updates.handle, userId);
        if (!isAvailable) {
          throw new Error('Handle is already taken');
        }
      } catch (error: unknown) {
        if (isGSI3ValidationError(error)) {
          console.warn('GSI3 index not found - allowing handle update without uniqueness check');
          gsi3Available = false;
        } else {
          throw error;
        }
      }
    }

    // Build update data using helper
    const updateData = buildProfileUpdateData(updates, {
      includeGSI3: gsi3Available,
      userId,
      timestamp: new Date().toISOString()
    });

    // Build UpdateExpression using utility from Phase 2.1
    const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } =
      buildUpdateExpressionFromObject(updateData);

    const result = await this.dynamoClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE'
      },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }));

    return mapEntityToProfile(result.Attributes as UserProfileEntity);
  }

  /**
   * Update profile picture URLs
   */
  async updateProfilePicture(
    userId: string,
    profilePictureUrl: string,
    thumbnailUrl: string
  ): Promise<Profile> {
    const result = await this.dynamoClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE'
      },
      UpdateExpression: 'SET profilePictureUrl = :url, profilePictureThumbnailUrl = :thumb, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':url': profilePictureUrl,
        ':thumb': thumbnailUrl,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    }));

    return mapEntityToProfile(result.Attributes as UserProfileEntity);
  }

  /**
   * Generate presigned URL for S3 upload
   */
  async generatePresignedUrl(
    userId: string,
    request: GetPresignedUrlRequest
  ): Promise<GetPresignedUrlResponse> {
    if (!this.s3BucketName) {
      throw new Error('S3 bucket not configured');
    }

    const fileExtension = request.fileType.split('/')[1];
    const uniqueId = randomUUID();

    let key: string;
    let thumbnailKey: string | undefined;

    if (request.purpose === 'profile-picture') {
      key = `users/${userId}/profile/${uniqueId}.${fileExtension}`;
      thumbnailKey = `users/${userId}/profile/${uniqueId}_thumb.${fileExtension}`;
    } else {
      key = `users/${userId}/posts/${uniqueId}.${fileExtension}`;
      thumbnailKey = `users/${userId}/posts/${uniqueId}_thumb.${fileExtension}`;
    }

    const command: PutObjectCommandInput = {
      Bucket: this.s3BucketName,
      Key: key,
      ContentType: request.fileType
    };

    const putObjectCommand = new PutObjectCommand(command);

    const uploadUrl = await getSignedUrl(
      this.s3Client,
      putObjectCommand,
      { expiresIn: 3600 }
    );

    const baseUrl = this.getBaseUrl();

    return {
      uploadUrl,
      publicUrl: `${baseUrl}/${key}`,
      thumbnailUrl: thumbnailKey ? `${baseUrl}/${thumbnailKey}` : undefined,
      expiresIn: 3600
    };
  }

  /**
   * Increment posts count
   */
  async incrementPostsCount(userId: string): Promise<void> {
    await this.dynamoClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE'
      },
      UpdateExpression: 'SET postsCount = if_not_exists(postsCount, :zero) + :inc',
      ExpressionAttributeValues: {
        ':inc': 1,
        ':zero': 0
      }
    }));
  }

  /**
   * Decrement posts count
   */
  async decrementPostsCount(userId: string): Promise<void> {
    await this.dynamoClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE'
      },
      UpdateExpression: 'SET postsCount = if_not_exists(postsCount, :zero) - :dec',
      ExpressionAttributeValues: {
        ':dec': 1,
        ':zero': 0
      },
      ConditionExpression: 'if_not_exists(postsCount, :zero) > :zero'
    }));
  }

  /**
   * Reset posts count to zero
   * Used when bulk deleting all user posts
   */
  async resetPostsCount(userId: string): Promise<void> {
    await this.dynamoClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE'
      },
      UpdateExpression: 'SET postsCount = :zero',
      ExpressionAttributeValues: {
        ':zero': 0
      }
    }));
  }

  /**
   * Get base URL for file storage based on environment configuration
   * Uses environment-config utility for consistent URL generation
   * Priority: CloudFront > LocalStack > AWS S3
   */
  private getBaseUrl(): string {
    return getS3BaseUrl({
      cloudFrontDomain: this.cloudFrontDomain,
      s3BucketName: this.s3BucketName,
      region: process.env.AWS_REGION,
      localStackEndpoint: process.env.LOCALSTACK_ENDPOINT
    });
  }

}