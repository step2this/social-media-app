import { z } from 'zod';
import { UserProfileSchema } from './auth.schema.js';
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
 * Enhanced profile schema with handle and profile picture
 */
export const ProfileSchema = UserProfileSchema.extend({
  handle: HandleSchema,
  profilePictureUrl: OptionalURLField,
  profilePictureThumbnailUrl: OptionalURLField,
  postsCount: CountField,
  followersCount: CountField,
  followingCount: CountField
});

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