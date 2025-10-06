import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
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

/**
 * Profile entity extension for DynamoDB
 */
export interface ProfileEntity {
  PK: string; // USER#<userId>
  SK: string; // PROFILE
  GSI1PK: string; // EMAIL#<email>
  GSI1SK: string; // USER#<userId>
  GSI2PK: string; // USERNAME#<username>
  GSI2SK: string; // USER#<userId>
  GSI3PK?: string; // HANDLE#<handle>
  GSI3SK?: string; // USER#<userId>
  id: string;
  email: string;
  username: string;
  handle?: string;
  fullName?: string;
  bio?: string;
  avatarUrl?: string;
  profilePictureUrl?: string;
  profilePictureThumbnailUrl?: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  entityType: 'USER';
}

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
      // Use same environment detection logic as backend
      const isLocalStack = (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') &&
                          process.env.USE_LOCALSTACK === 'true';

      const s3Config: any = {
        region: process.env.AWS_REGION || 'us-east-1'
      };

      if (isLocalStack) {
        s3Config.endpoint = process.env.LOCALSTACK_ENDPOINT || 'http://localhost:4566';
        s3Config.forcePathStyle = true;
        // For LocalStack compatibility, disable automatic checksum calculation
        s3Config.requestChecksumCalculation = 'WHEN_REQUIRED';
        s3Config.responseChecksumValidation = 'WHEN_REQUIRED';
      }

      this.s3Client = new S3Client(s3Config);
    }
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

    return result.Item ? this.mapEntityToProfile(result.Item as ProfileEntity) : null;
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

    const entity = result.Items[0] as ProfileEntity;
    return this.mapEntityToPublicProfile(entity);
  }

  /**
   * Check if handle is available
   */
  async isHandleAvailable(handle: string, excludeUserId?: string): Promise<boolean> {
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
      const entity = result.Items[0] as ProfileEntity;
      return entity.id === excludeUserId;
    }

    return false;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: UpdateProfileWithHandleRequest
  ): Promise<Profile> {
    const updateExpressions: string[] = ['#updatedAt = :updatedAt'];
    const expressionAttributeNames: Record<string, string> = {
      '#updatedAt': 'updatedAt'
    };
    const expressionAttributeValues: Record<string, any> = {
      ':updatedAt': new Date().toISOString()
    };

    // Handle update (with uniqueness check)
    if (updates.handle !== undefined) {
      const isAvailable = await this.isHandleAvailable(updates.handle, userId);
      if (!isAvailable) {
        throw new Error('Handle is already taken');
      }
      updateExpressions.push('#handle = :handle');
      updateExpressions.push('GSI3PK = :gsi3pk');
      updateExpressions.push('GSI3SK = :gsi3sk');
      expressionAttributeNames['#handle'] = 'handle';
      expressionAttributeValues[':handle'] = updates.handle.toLowerCase();
      expressionAttributeValues[':gsi3pk'] = `HANDLE#${updates.handle.toLowerCase()}`;
      expressionAttributeValues[':gsi3sk'] = `USER#${userId}`;
    }

    // Other updates
    if (updates.bio !== undefined) {
      updateExpressions.push('#bio = :bio');
      expressionAttributeNames['#bio'] = 'bio';
      expressionAttributeValues[':bio'] = updates.bio;
    }

    if (updates.fullName !== undefined) {
      updateExpressions.push('#fullName = :fullName');
      expressionAttributeNames['#fullName'] = 'fullName';
      expressionAttributeValues[':fullName'] = updates.fullName;
    }

    const result = await this.dynamoClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE'
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }));

    return this.mapEntityToProfile(result.Attributes as ProfileEntity);
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

    return this.mapEntityToProfile(result.Attributes as ProfileEntity);
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
   * Get base URL for file storage based on environment configuration
   * Priority: CloudFront > LocalStack > AWS S3
   */
  private getBaseUrl(): string {
    // First priority: CloudFront domain (production/staging)
    if (this.cloudFrontDomain) {
      return `https://${this.cloudFrontDomain}`;
    }

    // Second priority: LocalStack (local development)
    const useLocalStack = (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') &&
                         process.env.USE_LOCALSTACK === 'true';
    const localStackEndpoint = process.env.LOCALSTACK_ENDPOINT;

    if (useLocalStack && localStackEndpoint && this.s3BucketName) {
      return `${localStackEndpoint}/${this.s3BucketName}`;
    }

    // Third priority: AWS S3 (fallback)
    if (this.s3BucketName) {
      return `https://${this.s3BucketName}.s3.amazonaws.com`;
    }

    throw new Error('S3 bucket not configured');
  }

  /**
   * Map entity to Profile
   */
  private mapEntityToProfile(entity: ProfileEntity): Profile {
    return {
      id: entity.id,
      email: entity.email,
      username: entity.username,
      handle: entity.handle || entity.username,
      fullName: entity.fullName,
      bio: entity.bio,
      avatarUrl: entity.avatarUrl,
      profilePictureUrl: entity.profilePictureUrl,
      profilePictureThumbnailUrl: entity.profilePictureThumbnailUrl,
      postsCount: entity.postsCount || 0,
      followersCount: entity.followersCount || 0,
      followingCount: entity.followingCount || 0,
      emailVerified: entity.emailVerified,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }

  /**
   * Map entity to PublicProfile
   */
  private mapEntityToPublicProfile(entity: ProfileEntity): PublicProfile {
    return {
      id: entity.id,
      username: entity.username,
      handle: entity.handle || entity.username,
      fullName: entity.fullName,
      bio: entity.bio,
      profilePictureUrl: entity.profilePictureUrl,
      profilePictureThumbnailUrl: entity.profilePictureThumbnailUrl,
      postsCount: entity.postsCount || 0,
      followersCount: entity.followersCount || 0,
      followingCount: entity.followingCount || 0,
      createdAt: entity.createdAt
    };
  }
}