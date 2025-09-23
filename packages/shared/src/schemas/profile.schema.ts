import { z } from 'zod';
import { UserProfileSchema } from './auth.schema.js';

/**
 * Handle validation schema
 */
export const HandleSchema = z.string()
  .trim()
  .toLowerCase()
  .min(3, 'Handle must be at least 3 characters')
  .max(30, 'Handle must not exceed 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Handle can only contain letters, numbers, and underscores');

/**
 * Enhanced profile schema with handle and profile picture
 */
export const ProfileSchema = UserProfileSchema.extend({
  handle: HandleSchema,
  profilePictureUrl: z.string().url().optional(),
  profilePictureThumbnailUrl: z.string().url().optional(),
  postsCount: z.number().int().nonnegative().default(0),
  followersCount: z.number().int().nonnegative().default(0),
  followingCount: z.number().int().nonnegative().default(0)
});

/**
 * Request schemas
 */
export const UpdateProfileWithHandleRequestSchema = z.object({
  handle: HandleSchema.optional(),
  bio: z.string().max(500).trim().optional(),
  fullName: z.string().min(1).max(100).trim().optional()
});

export const GetProfileByHandleRequestSchema = z.object({
  handle: HandleSchema
});

export const GetPresignedUrlRequestSchema = z.object({
  fileType: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  purpose: z.enum(['profile-picture', 'post-image'])
});

/**
 * Response schemas
 */
export const ProfileResponseSchema = z.object({
  profile: ProfileSchema
});

export const UpdateProfileResponseSchema = z.object({
  profile: ProfileSchema,
  message: z.string()
});

export const GetPresignedUrlResponseSchema = z.object({
  uploadUrl: z.string().url(),
  publicUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  expiresIn: z.number().positive()
});

export const PublicProfileSchema = ProfileSchema.pick({
  id: true,
  handle: true,
  username: true,
  fullName: true,
  bio: true,
  profilePictureUrl: true,
  profilePictureThumbnailUrl: true,
  postsCount: true,
  followersCount: true,
  followingCount: true,
  createdAt: true
});

export const PublicProfileResponseSchema = z.object({
  profile: PublicProfileSchema
});

/**
 * Type exports
 */
export type Profile = z.infer<typeof ProfileSchema>;
export type PublicProfile = z.infer<typeof PublicProfileSchema>;
export type UpdateProfileWithHandleRequest = z.infer<typeof UpdateProfileWithHandleRequestSchema>;
export type GetProfileByHandleRequest = z.infer<typeof GetProfileByHandleRequestSchema>;
export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;
export type UpdateProfileResponse = z.infer<typeof UpdateProfileResponseSchema>;
export type PublicProfileResponse = z.infer<typeof PublicProfileResponseSchema>;
export type GetPresignedUrlRequest = z.infer<typeof GetPresignedUrlRequestSchema>;
export type GetPresignedUrlResponse = z.infer<typeof GetPresignedUrlResponseSchema>;