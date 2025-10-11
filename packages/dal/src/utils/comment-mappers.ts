/**
 * Comment mapping utilities
 * Provides pure functional mappers for converting CommentEntity to Comment
 */

import type { Comment } from '@social-media-app/shared';

/**
 * CommentEntity for DynamoDB
 *
 * Access patterns:
 * 1. Get comments for a post:
 *    Query: PK = POST#<postId>, SK begins_with COMMENT#
 * 2. Get single comment:
 *    Query GSI1: GSI1PK = COMMENT#<commentId>
 * 3. Get user's comments:
 *    Query GSI2: GSI2PK = USER#<userId>, SK begins_with COMMENT#
 */
export interface CommentEntity {
  readonly PK: string; // POST#<postId>
  readonly SK: string; // COMMENT#<timestamp>#<commentId>
  readonly GSI1PK: string; // COMMENT#<commentId>
  readonly GSI1SK: string; // POST#<postId>
  readonly GSI2PK: string; // USER#<userId>
  readonly GSI2SK: string; // COMMENT#<timestamp>#<commentId>
  readonly id: string;
  readonly postId: string;
  readonly userId: string;
  readonly userHandle: string;
  readonly content: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly entityType: 'COMMENT';
}

/**
 * Maps CommentEntity to base comment fields
 * Pure function - extracts domain fields and removes DynamoDB keys
 *
 * @param entity - CommentEntity from DynamoDB
 * @returns Comment fields (without DynamoDB keys)
 */
export const mapBaseCommentFields = (entity: CommentEntity): Comment => ({
  id: entity.id,
  postId: entity.postId,
  userId: entity.userId,
  userHandle: entity.userHandle,
  content: entity.content,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt
});

/**
 * Convenience mapper: CommentEntity → Comment
 * Pure function - direct mapping for simple use cases
 *
 * @param entity - CommentEntity from DynamoDB
 * @returns Comment domain object
 */
export const mapEntityToComment = (entity: CommentEntity): Comment =>
  mapBaseCommentFields(entity);
