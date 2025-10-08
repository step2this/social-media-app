import { z } from 'zod';
import { UUIDField, CountField } from './base.schema.js';

/**
 * Follow request schemas
 */
export const FollowUserRequestSchema = z.object({
  userId: UUIDField
});

export const UnfollowUserRequestSchema = z.object({
  userId: UUIDField
});

export const GetFollowStatusRequestSchema = z.object({
  userId: UUIDField
});

/**
 * Follow response schemas
 */
export const FollowUserResponseSchema = z.object({
  success: z.boolean(),
  followersCount: CountField,
  followingCount: CountField,
  isFollowing: z.boolean()
});

export const UnfollowUserResponseSchema = z.object({
  success: z.boolean(),
  followersCount: CountField,
  followingCount: CountField,
  isFollowing: z.boolean()
});

export const GetFollowStatusResponseSchema = z.object({
  isFollowing: z.boolean(),
  followersCount: CountField,
  followingCount: CountField
});

/**
 * Type exports
 */
export type FollowUserRequest = z.infer<typeof FollowUserRequestSchema>;
export type FollowUserResponse = z.infer<typeof FollowUserResponseSchema>;
export type UnfollowUserRequest = z.infer<typeof UnfollowUserRequestSchema>;
export type UnfollowUserResponse = z.infer<typeof UnfollowUserResponseSchema>;
export type GetFollowStatusRequest = z.infer<typeof GetFollowStatusRequestSchema>;
export type GetFollowStatusResponse = z.infer<typeof GetFollowStatusResponseSchema>;
