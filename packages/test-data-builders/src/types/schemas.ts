/**
 * Zod Schemas for Test Data Builder System
 *
 * Provides runtime validation schemas for all builder configurations.
 * These schemas ensure type safety, clear optional/required fields, and
 * generate helpful validation error messages.
 *
 * @module builders/types/schemas
 */

import { z } from 'zod';

// ============================================================================
// Base Schemas
// ============================================================================

/**
 * Range schema for random number generation
 * Used for generating random counts (e.g., likes between 10-50)
 */
export const RangeSchema = z.object({
  min: z.number().int().nonnegative(),
  max: z.number().int().nonnegative(),
}).refine(data => data.min <= data.max, {
  message: "min must be <= max",
  path: ['min'],
});

/**
 * Builder system configuration schema
 */
export const BuilderConfigSchema = z.object({
  useRealServices: z.boolean().default(true),
  logLevel: z.enum(['debug', 'info', 'error']).default('info'),
  batchSize: z.number().int().positive().default(10),
  maxRetries: z.number().int().nonnegative().default(3),
  dryRun: z.boolean().default(false),
});

// ============================================================================
// Entity Builder Schemas
// ============================================================================

/**
 * UserBuilder configuration schema
 *
 * All fields are optional since builders can auto-generate values.
 * Validates formats when values are provided.
 */
export const UserConfigSchema = z.object({
  email: z.string().email().optional(),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username must contain only letters, numbers, and underscores')
    .optional(),
  handle: z.string()
    .min(3, 'Handle must be at least 3 characters')
    .max(30, 'Handle must be at most 30 characters')
    .regex(/^[a-z0-9_]+$/, 'Handle must be lowercase letters, numbers, and underscores only')
    .optional(),
  fullName: z.string().optional(),
  bio: z.string().optional(),
  profilePictureUrl: z.string().url('Profile picture must be a valid URL').optional(),
  emailVerified: z.boolean().optional(),
  isInfluencer: z.boolean().optional(),
  followersCount: z.number().int().nonnegative().optional(),
  followingCount: z.number().int().nonnegative().optional(),
}).strict();

/**
 * PostBuilder configuration schema
 *
 * Only userId and userHandle are required.
 * imageUrl is explicitly optional and will be auto-generated if not provided.
 */
export const PostConfigSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
  userHandle: z.string().min(1, 'User handle is required'),
  caption: z.string()
    .max(2200, 'Caption must be at most 2200 characters')
    .optional(),
  imageUrl: z.string()
    .url('Image URL must be a valid URL')
    .optional(), // ✅ Explicitly optional - fixes validation error
  thumbnailUrl: z.string()
    .url('Thumbnail URL must be a valid URL')
    .optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),

  // Builder-specific presets
  isViral: z.boolean().optional(),
  isTrending: z.boolean().optional(),

  // Deferred engagement (created after post)
  likesCount: z.union([
    z.number().int().nonnegative(),
    RangeSchema,
  ]).optional(),
  commentsCount: z.union([
    z.number().int().nonnegative(),
    RangeSchema,
  ]).optional(),
}).strict();

/**
 * LikeBuilder configuration schema
 *
 * Both userId and postId are required.
 */
export const LikeConfigSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
  postId: z.string().uuid('Post ID must be a valid UUID'),
}).strict();

/**
 * CommentBuilder configuration schema
 *
 * userId, userHandle, and postId are required.
 * content is optional and will be auto-generated if not provided.
 */
export const CommentConfigSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
  userHandle: z.string().min(1, 'User handle is required'),
  postId: z.string().uuid('Post ID must be a valid UUID'),
  content: z.string()
    .min(1, 'Comment must be at least 1 character')
    .max(500, 'Comment must be at most 500 characters')
    .optional(),
}).strict();

/**
 * FollowBuilder configuration schema
 *
 * Both followerId and followeeId are required.
 * Includes validation to prevent self-follows.
 */
export const FollowConfigSchema = z.object({
  followerId: z.string().uuid('Follower ID must be a valid UUID'),
  followeeId: z.string().uuid('Followee ID must be a valid UUID'),
}).strict().refine(
  data => data.followerId !== data.followeeId,
  {
    message: "Users cannot follow themselves",
    path: ["followerId"],
  }
);

// ============================================================================
// Type Inference Helpers
// ============================================================================

/**
 * Infer TypeScript types from schemas
 * This ensures runtime validation and TypeScript types stay in sync
 */
export type UserConfig = z.infer<typeof UserConfigSchema>;
export type PostConfig = z.infer<typeof PostConfigSchema>;
export type LikeConfig = z.infer<typeof LikeConfigSchema>;
export type CommentConfig = z.infer<typeof CommentConfigSchema>;
export type FollowConfig = z.infer<typeof FollowConfigSchema>;
export type BuilderConfig = z.infer<typeof BuilderConfigSchema>;
export type Range = z.infer<typeof RangeSchema>;

// ============================================================================
// Schema Validation Helpers
// ============================================================================

/**
 * Type guard for Range type
 */
export function isRange(value: unknown): value is Range {
  return RangeSchema.safeParse(value).success;
}

/**
 * Convert Zod errors to builder ValidationError format
 */
export function zodErrorToValidationErrors(error: z.ZodError) {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    value: err.path.length > 0 ? undefined : err,
  }));
}
