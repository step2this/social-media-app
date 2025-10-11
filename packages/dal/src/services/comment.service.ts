import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import type {
  CreateCommentResponse,
  DeleteCommentResponse,
  CommentsListResponse,
  Comment
} from '@social-media-app/shared';
import { CommentContentField } from '@social-media-app/shared';
import { type CommentEntity, mapEntityToComment } from '../utils/comment-mappers.js';

/**
 * Comment service for managing post comments
 */
export class CommentService {
  constructor(
    private readonly dynamoClient: DynamoDBDocumentClient,
    private readonly tableName: string
  ) {}

  /**
   * Create a new comment on a post
   * Validates content length and creates comment entity
   *
   * @param userId - ID of user creating the comment
   * @param postId - ID of post being commented on
   * @param userHandle - Handle of user creating the comment
   * @param content - Comment content (1-500 characters)
   * @returns CreateCommentResponse with comment details
   * @throws Error if validation fails
   */
  async createComment(
    userId: string,
    postId: string,
    userHandle: string,
    content: string
  ): Promise<CreateCommentResponse> {
    // Validate content using Zod schema
    const validationResult = CommentContentField.safeParse(content);
    if (!validationResult.success) {
      throw new Error(`Invalid comment content: ${validationResult.error.message}`);
    }

    const commentId = randomUUID();
    const now = new Date().toISOString();

    const commentEntity: CommentEntity = {
      PK: `POST#${postId}`,
      SK: `COMMENT#${now}#${commentId}`,
      GSI1PK: `COMMENT#${commentId}`,
      GSI1SK: `POST#${postId}`,
      GSI2PK: `USER#${userId}`,
      GSI2SK: `COMMENT#${now}#${commentId}`,
      id: commentId,
      postId,
      userId,
      userHandle,
      content: validationResult.data, // Use validated & trimmed content
      createdAt: now,
      updatedAt: now,
      entityType: 'COMMENT'
    };

    await this.dynamoClient.send(new PutCommand({
      TableName: this.tableName,
      Item: commentEntity
    }));

    return {
      comment: mapEntityToComment(commentEntity),
      commentsCount: 0 // Will be updated by stream processor
    };
  }

  /**
   * Delete a comment
   * Only the comment owner can delete their comment
   *
   * @param userId - ID of user attempting deletion
   * @param commentId - ID of comment to delete
   * @returns DeleteCommentResponse
   * @throws Error if user is not the comment owner
   */
  async deleteComment(
    userId: string,
    commentId: string
  ): Promise<DeleteCommentResponse> {
    // First, get the comment to verify ownership
    const getResult = await this.dynamoClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `COMMENT#${commentId}`
      },
      Limit: 1
    }));

    if (getResult.Items && getResult.Items.length > 0) {
      const commentEntity = getResult.Items[0] as CommentEntity;

      // Verify ownership
      if (commentEntity.userId !== userId) {
        throw new Error('Unauthorized: You can only delete your own comments');
      }

      // Delete the comment
      await this.dynamoClient.send(new DeleteCommand({
        TableName: this.tableName,
        Key: {
          PK: commentEntity.PK,
          SK: commentEntity.SK
        }
      }));
    }

    // Idempotent - return success even if comment doesn't exist
    return {
      success: true,
      message: 'Comment deleted successfully'
    };
  }

  /**
   * Get comments for a post with pagination
   * Returns comments in descending order (newest first)
   *
   * @param postId - ID of post
   * @param limit - Maximum number of comments to return (default: 20)
   * @param cursor - Pagination cursor (optional)
   * @returns CommentsListResponse with comments and pagination info
   */
  async getCommentsByPost(
    postId: string,
    limit: number = 20,
    _cursor?: string
  ): Promise<CommentsListResponse> {
    const result = await this.dynamoClient.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `POST#${postId}`,
        ':skPrefix': 'COMMENT#'
      },
      ScanIndexForward: false, // Descending order (newest first)
      Limit: limit
    }));

    const comments: Comment[] = (result.Items || [])
      .map(item => mapEntityToComment(item as CommentEntity));

    return {
      comments,
      totalCount: comments.length,
      hasMore: false, // Simplified for now - pagination can be enhanced later
      nextCursor: undefined
    };
  }
}
