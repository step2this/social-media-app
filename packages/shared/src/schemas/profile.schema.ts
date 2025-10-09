import { z } from 'zod';
import { UserSchema } from './user.schema.js';
import {
  HandleField,
  OptionalFullNameField,
  BioField,
  OptionalURLField,
  CountField,
  PresignedUrlRequestSchema,
  PresignedUrlResponseSchema
} from './base.schema.js';

/**
 * Handle validation schema (from base schema)
 */
export const HandleSchema = HandleField;

/**
 * Profile data schema - presentation and social media fields
 */
export const ProfileDataSchema = z.object({
  fullName: OptionalFullNameField,
  bio: BioField,
  handle: HandleSchema,
  profilePictureUrl: OptionalURLField,
  profilePictureThumbnailUrl: OptionalURLField,
  postsCount: CountField,
  followersCount: CountField,
  followingCount: CountField
});

/**
 * Enhanced profile schema using composition (not inheritance)
 * Combines core User identity with Profile presentation data
 */
export const ProfileSchema = UserSchema.merge(ProfileDataSchema);

/**
 * Request schemas
 */
export const UpdateProfileWithHandleRequestSchema = z.object({
  handle: HandleSchema.optional(),
  bio: BioField,
  fullName: OptionalFullNameField
});

export const GetProfileByHandleRequestSchema = z.object({
  handle: HandleSchema
});

export const GetPresignedUrlRequestSchema = PresignedUrlRequestSchema;

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

export const GetPresignedUrlResponseSchema = PresignedUrlResponseSchema;

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
}).extend({
  isFollowing: z.boolean().optional()
});

export const PublicProfileResponseSchema = z.object({
  profile: PublicProfileSchema
});

/**
 * Type exports
 */
export type ProfileData = z.infer<typeof ProfileDataSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type PublicProfile = z.infer<typeof PublicProfileSchema>;
export type UpdateProfileWithHandleRequest = z.infer<typeof UpdateProfileWithHandleRequestSchema>;
export type GetProfileByHandleRequest = z.infer<typeof GetProfileByHandleRequestSchema>;
export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;
export type UpdateProfileResponse = z.infer<typeof UpdateProfileResponseSchema>;
export type PublicProfileResponse = z.infer<typeof PublicProfileResponseSchema>;
export type GetPresignedUrlRequest = z.infer<typeof GetPresignedUrlRequestSchema>;
export type GetPresignedUrlResponse = z.infer<typeof GetPresignedUrlResponseSchema>;