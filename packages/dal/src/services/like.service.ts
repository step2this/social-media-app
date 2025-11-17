import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { PutCommand, GetCommand, DeleteCommand, BatchGetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type {
  LikePostResponse,
  UnlikePostResponse,
  GetPostLikeStatusResponse
} from '@social-media-app/shared';

/**
 * Like entity for DynamoDB
 */
export interface LikeEntity {
  PK: string;       // POST#<postId>
  SK: string;       // LIKE#<userId>
  GSI2PK: string;   // USER#<userId> (for "posts I liked" queries)
  GSI2SK: string;   // LIKE#<postId>
  userId: string;
  postId: string;
  postUserId: string; // User ID of the post owner (for notifications)
  postSK: string;     // SK of the post entity (for efficient post lookup)
  createdAt: string;
  entityType: 'LIKE';
}

/**
 * Like status for batch operations
 */
export interface LikeStatus {
  isLiked: boolean;
  likesCount: number;
}

/**
 * Like service for managing post likes
 */
export class LikeService {
  constructor(
    private readonly dynamoClient: DynamoDBDocumentClient,
    private readonly tableName: string
  ) {}

  /**
   * Like a post
   * Uses conditional PutItem to prevent duplicate likes
   *
   * @param userId - User ID of the user liking the post
   * @param postId - Post ID being liked
   * @param postUserId - User ID of the post owner (for notifications)
   * @param postSK - Sort key of the post entity (for efficient post lookup)
   */
  async likePost(userId: string, postId: string, postUserId: string, postSK: string): Promise<LikePostResponse> {
    const now = new Date().toISOString();

    const likeEntity: LikeEntity = {
      PK: `POST#${postId}`,
      SK: `LIKE#${userId}`,
      GSI2PK: `USER#${userId}`,
      GSI2SK: `LIKE#${postId}`,
      userId,
      postId,
      postUserId,
      postSK,
      createdAt: now,
      entityType: 'LIKE'
    };

    try {
      // Create the like entity with conditional check
      await this.dynamoClient.send(new PutCommand({
        TableName: this.tableName,
        Item: likeEntity,
        ConditionExpression: 'attribute_not_exists(PK)'
      }));

      // Atomically increment the post's likesCount
      const updateResult = await this.dynamoClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${postUserId}`,
          SK: `POST#${postId}`
        },
        UpdateExpression: 'SET likesCount = if_not_exists(likesCount, :zero) + :inc',
        ExpressionAttributeValues: {
          ':inc': 1,
          ':zero': 0
        },
        ReturnValues: 'ALL_NEW'
      }));

      const newLikesCount = updateResult.Attributes?.likesCount || 1;

      return {
        success: true,
        likesCount: newLikesCount,
        isLiked: true
      };
    } catch (error: any) {
      // If conditional check fails, user already liked this post
      if (error.name === 'ConditionalCheckFailedException' || error.__type === 'ConditionalCheckFailedException') {
        // Fetch current like count from the post
        const getResult = await this.dynamoClient.send(new GetCommand({
          TableName: this.tableName,
          Key: {
            PK: `USER#${postUserId}`,
            SK: `POST#${postId}`
          },
          ProjectionExpression: 'likesCount'
        }));

        return {
          success: true,
          likesCount: getResult.Item?.likesCount || 0,
          isLiked: true
        };
      }
      throw error;
    }
  }

  /**
   * Unlike a post
   * Idempotent operation - doesn't fail if already unliked
   */
  async unlikePost(userId: string, postId: string): Promise<UnlikePostResponse> {
    // First, get the like entity to find the post owner
    const getLikeResult = await this.dynamoClient.send(new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `POST#${postId}`,
        SK: `LIKE#${userId}`
      }
    }));

    const likeEntity = getLikeResult.Item as LikeEntity | undefined;

    // Delete the like entity
    await this.dynamoClient.send(new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: `POST#${postId}`,
        SK: `LIKE#${userId}`
      }
    }));

    // If like existed, decrement the post's likesCount
    if (likeEntity) {
      const updateResult = await this.dynamoClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${likeEntity.postUserId}`,
          SK: `POST#${postId}`
        },
        UpdateExpression: 'SET likesCount = if_not_exists(likesCount, :zero) - :dec',
        ExpressionAttributeValues: {
          ':dec': 1,
          ':zero': 0
        },
        ConditionExpression: 'likesCount > :zero',
        ReturnValues: 'ALL_NEW'
      }));

      const newLikesCount = updateResult.Attributes?.likesCount || 0;

      return {
        success: true,
        likesCount: newLikesCount,
        isLiked: false
      };
    }

    // Like didn't exist - return current count from post
    return {
      success: true,
      likesCount: 0,
      isLiked: false
    };
  }

  /**
   * Get post like status for a user
   */
  async getPostLikeStatus(userId: string, postId: string): Promise<GetPostLikeStatusResponse> {
    const result = await this.dynamoClient.send(new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `POST#${postId}`,
        SK: `LIKE#${userId}`
      }
    }));

    return {
      isLiked: !!result.Item,
      likesCount: 0 // Will be fetched from Post entity separately
    };
  }

  /**
   * Batch fetch like statuses for multiple posts for a specific user
   * Optimized for DataLoader batching to solve N+1 query problem
   *
   * @param userId - User ID to check like status for
   * @param postIds - Array of post IDs to check (max 100 per DynamoDB limits)
   * @returns Map of postId to LikeStatus for DataLoader compatibility
   *
   * @example
   * ```typescript
   * const likeStatuses = await likeService.getLikeStatusesByPostIds('user123', ['post1', 'post2']);
   * const post1Status = likeStatuses.get('post1'); // {isLiked: boolean, likesCount: number}
   * ```
   *
   * Note: likesCount is returned as 0 in batch operations.
   * The actual count should be fetched from the Post entity.
   */
  async getLikeStatusesByPostIds(userId: string, postIds: string[]): Promise<Map<string, LikeStatus>> {
    const likeStatusMap = new Map<string, LikeStatus>();

    // Return empty map if no IDs provided
    if (postIds.length === 0) {
      return likeStatusMap;
    }

    // Initialize all posts with default status (not liked)
    for (const postId of postIds) {
      likeStatusMap.set(postId, { isLiked: false, likesCount: 0 });
    }

    // DynamoDB BatchGetItem has a limit of 100 items per request
    const batchSize = 100;
    const batches: string[][] = [];

    // Split into batches of 100
    for (let i = 0; i < postIds.length; i += batchSize) {
      batches.push(postIds.slice(i, i + batchSize));
    }

    // Process each batch
    for (const batch of batches) {
      // Build keys for batch request using composite key pattern
      const keys = batch.map(postId => ({
        PK: `POST#${postId}`,
        SK: `LIKE#${userId}`
      }));

      const result = await this.dynamoClient.send(new BatchGetCommand({
        RequestItems: {
          [this.tableName]: {
            Keys: keys
          }
        }
      }));

      // Process responses - if item exists, user has liked the post
      if (result.Responses && result.Responses[this.tableName]) {
        for (const item of result.Responses[this.tableName]) {
          const entity = item as LikeEntity;
          // Update the like status for posts that are liked
          likeStatusMap.set(entity.postId, { isLiked: true, likesCount: 0 });
        }
      }

      // Handle unprocessed keys (usually due to throttling)
      if (result.UnprocessedKeys && result.UnprocessedKeys[this.tableName]) {
        // In production, you might want to implement retry logic here
        console.warn(`Unprocessed keys in LikeService.getLikeStatusesByPostIds:`,
          result.UnprocessedKeys[this.tableName].Keys?.length);
      }
    }

    return likeStatusMap;
  }
}
