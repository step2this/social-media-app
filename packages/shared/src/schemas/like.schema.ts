import { z } from 'zod';
import { UUIDField, CountField } from './base.schema.js';

/**
 * Like request schemas
 */
export const LikePostRequestSchema = z.object({
  postId: UUIDField
});

export const UnlikePostRequestSchema = z.object({
  postId: UUIDField
});

export const GetPostLikeStatusRequestSchema = z.object({
  postId: UUIDField
});

/**
 * Like response schemas
 */
export const LikePostResponseSchema = z.object({
  success: z.boolean(),
  likesCount: CountField,
  isLiked: z.boolean()
});

export const UnlikePostResponseSchema = z.object({
  success: z.boolean(),
  likesCount: CountField,
  isLiked: z.boolean()
});

export const GetPostLikeStatusResponseSchema = z.object({
  isLiked: z.boolean(),
  likesCount: CountField
});

/**
 * Type exports
 */
export type LikePostRequest = z.infer<typeof LikePostRequestSchema>;
export type LikePostResponse = z.infer<typeof LikePostResponseSchema>;
export type UnlikePostRequest = z.infer<typeof UnlikePostRequestSchema>;
export type UnlikePostResponse = z.infer<typeof UnlikePostResponseSchema>;
export type GetPostLikeStatusRequest = z.infer<typeof GetPostLikeStatusRequestSchema>;
export type GetPostLikeStatusResponse = z.infer<typeof GetPostLikeStatusResponseSchema>;
