import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import type {
  CreateCommentResponse,
  DeleteCommentResponse,
  CommentsListResponse
} from '@social-media-app/shared';
import { CommentContentField } from '@social-media-app/shared';
import { type CommentEntity, mapEntityToComment } from '../utils/comment-mappers.js';
import {
  logDynamoDB,
  logServiceOp,
  logError,
  logValidation,
  logger
} from '../infrastructure/logger.js';

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
   * @param postUserId - User ID of the post owner (for notifications)
   * @param postSK - SK of the post entity (for efficient post lookup)
   * @returns CreateCommentResponse with comment details
   * @throws Error if validation fails
   */
  async createComment(
    userId: string,
    postId: string,
    userHandle: string,
    content: string,
    postUserId: string,
    postSK: string
  ): Promise<CreateCommentResponse> {
    const startTime = Date.now();

    try {
      // Validate content using Zod schema
      const validationResult = CommentContentField.safeParse(content);
      if (!validationResult.success) {
        logValidation('CommentService', 'content', validationResult.error.message, { 
          userId, 
          postId 
        });
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
      entityType: 'COMMENT',
      postUserId,
      postSK
    };

    logDynamoDB('put', { table: this.tableName, commentId, postId, userId });
    await this.dynamoClient.send(new PutCommand({
      TableName: this.tableName,
      Item: commentEntity
    }));

    const duration = Date.now() - startTime;
    logServiceOp('CommentService', 'createComment', { 
      commentId, 
      postId, 
      userId 
    }, duration);

    return {
      comment: mapEntityToComment(commentEntity),
      commentsCount: 0 // Will be updated by stream processor
    };
  } catch (error) {
    logError('CommentService', 'createComment', error as Error, { userId, postId });
    throw error;
  }
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
    const startTime = Date.now();

    try {
      // First, get the comment to verify ownership
      logDynamoDB('query', { table: this.tableName, gsi: 'GSI1', commentId });
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
      logDynamoDB('delete', { table: this.tableName, commentId, userId });
      await this.dynamoClient.send(new DeleteCommand({
        TableName: this.tableName,
        Key: {
          PK: commentEntity.PK,
          SK: commentEntity.SK
        }
      }));

      const duration = Date.now() - startTime;
      logServiceOp('CommentService', 'deleteComment', { commentId, userId }, duration);
    }

    // Idempotent - return success even if comment doesn't exist
    return {
      success: true,
      message: 'Comment deleted successfully'
    };
  } catch (error) {
    logError('CommentService', 'deleteComment', error as Error, { userId, commentId });
    throw error;
  }
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
    cursor?: string
  ): Promise<CommentsListResponse> {
    // 1. Get total count first
    logDynamoDB('query', { 
      table: this.tableName, 
      postId, 
      limit,
      operation: 'count'
    });
    const countResult = await this.dynamoClient.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `POST#${postId}`,
        ':skPrefix': 'COMMENT#'
      },
      Select: 'COUNT'
    }));
    const totalCount = countResult.Count || 0;

    // 2. Get paginated results (fetch limit+1 to detect hasMore)
    logDynamoDB('query', { 
      table: this.tableName, 
      postId, 
      limit,
      hasCursor: !!cursor 
    });
    const result = await this.dynamoClient.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `POST#${postId}`,
        ':skPrefix': 'COMMENT#'
      },
      ScanIndexForward: false, // Descending order (newest first)
      Limit: limit + 1, // Fetch one extra to detect if more exist
      ExclusiveStartKey: cursor ? this.decodeCursor(cursor) : undefined
    }));

    // 3. Check if more results exist
    const items = result.Items || [];
    const hasMore = items.length > limit;

    // 4. Slice to actual limit (remove the extra item)
    const paginatedItems = items.slice(0, limit);
    const comments = paginatedItems.map(item => mapEntityToComment(item as CommentEntity));

    // 5. Encode cursor from last returned item (for next page)
    const nextCursor = hasMore && paginatedItems.length > 0
      ? this.encodeCursor({
          PK: paginatedItems[paginatedItems.length - 1].PK as string,
          SK: paginatedItems[paginatedItems.length - 1].SK as string
        })
      : undefined;

    logger.debug({
      postId,
      totalCount,
      commentsReturned: comments.length,
      hasMore
    }, '[CommentService] Comments retrieved');

    return {
      comments,
      totalCount,
      hasMore,
      nextCursor
    };
  }

  /**
   * Encode DynamoDB key as base64 cursor
   *
   * @param key - DynamoDB key object with PK and SK
   * @returns Base64-encoded cursor string
   */
  private encodeCursor(key: { PK: string; SK: string }): string {
    return Buffer.from(JSON.stringify(key)).toString('base64');
  }

  /**
   * Decode base64 cursor to DynamoDB key
   *
   * @param cursor - Base64-encoded cursor string
   * @returns DynamoDB key object with PK and SK
   */
  private decodeCursor(cursor: string): { PK: string; SK: string } {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    return JSON.parse(decoded) as { PK: string; SK: string };
  }
}
