import { z } from 'zod';
import {
  UUIDField,
  CountField,
  TimestampField,
  PaginationRequestSchema,
  PaginationResponseSchema,
  SuccessResponseSchema
} from './base.schema.js';

/**
 * Comment content field validator
 * Comments must be 1-500 characters (similar to Instagram)
 */
export const CommentContentField = z.string()
  .min(1, 'Comment cannot be empty')
  .max(500, 'Comment must not exceed 500 characters')
  .trim();

/**
 * Comment entity schema
 */
export const CommentSchema = z.object({
  id: UUIDField,
  postId: UUIDField,
  userId: UUIDField,
  userHandle: z.string(),
  content: CommentContentField,
  createdAt: TimestampField,
  updatedAt: TimestampField
});

/**
 * Request schemas
 */
export const CreateCommentRequestSchema = z.object({
  postId: UUIDField,
  content: CommentContentField
});

export const DeleteCommentRequestSchema = z.object({
  commentId: UUIDField
});

export const GetCommentsRequestSchema = PaginationRequestSchema.extend({
  postId: UUIDField
});

/**
 * Response schemas
 */
export const CreateCommentResponseSchema = z.object({
  comment: CommentSchema,
  commentsCount: CountField
});

export const DeleteCommentResponseSchema = SuccessResponseSchema;

export const CommentsListResponseSchema = PaginationResponseSchema.extend({
  comments: z.array(CommentSchema),
  totalCount: CountField
});

/**
 * Type exports
 */
export type Comment = z.infer<typeof CommentSchema>;
export type CreateCommentRequest = z.infer<typeof CreateCommentRequestSchema>;
export type CreateCommentResponse = z.infer<typeof CreateCommentResponseSchema>;
export type DeleteCommentRequest = z.infer<typeof DeleteCommentRequestSchema>;
export type DeleteCommentResponse = z.infer<typeof DeleteCommentResponseSchema>;
export type GetCommentsRequest = z.infer<typeof GetCommentsRequestSchema>;
export type CommentsListResponse = z.infer<typeof CommentsListResponseSchema>;
