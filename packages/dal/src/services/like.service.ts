import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
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
  createdAt: string;
  entityType: 'LIKE';
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
   */
  async likePost(userId: string, postId: string): Promise<LikePostResponse> {
    const now = new Date().toISOString();

    const likeEntity: LikeEntity = {
      PK: `POST#${postId}`,
      SK: `LIKE#${userId}`,
      GSI2PK: `USER#${userId}`,
      GSI2SK: `LIKE#${postId}`,
      userId,
      postId,
      createdAt: now,
      entityType: 'LIKE'
    };

    try {
      await this.dynamoClient.send(new PutCommand({
        TableName: this.tableName,
        Item: likeEntity,
        ConditionExpression: 'attribute_not_exists(PK)'
      }));

      return {
        success: true,
        likesCount: 0, // Will be updated by stream processor
        isLiked: true
      };
    } catch (error: any) {
      // If conditional check fails, user already liked this post
      if (error.name === 'ConditionalCheckFailedException' || error.__type === 'ConditionalCheckFailedException') {
        return {
          success: true,
          likesCount: 0,
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
    await this.dynamoClient.send(new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: `POST#${postId}`,
        SK: `LIKE#${userId}`
      }
    }));

    return {
      success: true,
      likesCount: 0, // Will be updated by stream processor
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
}
