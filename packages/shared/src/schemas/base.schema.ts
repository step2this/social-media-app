import { z } from 'zod';

/**
 * Base field validators - single source of truth for common field patterns
 */

// Text field validators
export const FullNameField = z.string()
  .min(1, 'Full name is required')
  .max(100, 'Full name must not exceed 100 characters')
  .trim();

export const OptionalFullNameField = FullNameField.optional();

export const BioField = z.string()
  .max(500, 'Bio must not exceed 500 characters')
  .trim()
  .optional();

export const CaptionField = z.string()
  .max(2200, 'Caption must not exceed 2200 characters')
  .trim();

export const OptionalCaptionField = CaptionField.optional();

export const TagField = z.string()
  .max(50, 'Tag must not exceed 50 characters')
  .trim();

export const TagsArrayField = z.array(TagField)
  .max(30, 'Cannot have more than 30 tags')
  .default([]);

export const OptionalTagsArrayField = z.array(TagField)
  .max(30, 'Cannot have more than 30 tags')
  .optional();

// Identifier validators
export const UUIDField = z.string().uuid('Invalid UUID format');

export const HandleField = z.string()
  .trim()
  .toLowerCase()
  .min(3, 'Handle must be at least 3 characters')
  .max(30, 'Handle must not exceed 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Handle can only contain letters, numbers, and underscores');

// URL validators
export const URLField = z.string().url('Invalid URL format');
export const OptionalURLField = URLField.optional();

// Token validators
export const TokenField = z.string().min(1, 'Token is required');

export const PasswordTokenField = z.string().min(1, 'Password is required');

export const RefreshTokenField = z.string().min(1, 'Refresh token is required');

export const VerificationTokenField = z.string().min(1, 'Verification token is required');

export const ResetTokenField = z.string().min(1, 'Reset token is required');

// Numeric validators
export const PositiveIntField = z.number().int().nonnegative();

export const CountField = z.number().int().nonnegative().default(0);

// File type validators
export const ImageFileTypeField = z.enum([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
]);

export const UploadPurposeField = z.enum([
  'profile-picture',
  'post-image'
]);

// Timestamp validators
export const TimestampField = z.string().datetime();

/**
 * Common response patterns
 */
export const SuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string()
});

export const MessageResponseSchema = z.object({
  message: z.string()
});

/**
 * Pagination patterns
 */
export const PaginationRequestSchema = z.object({
  limit: z.number().int().positive().max(100).default(24),
  cursor: z.string().optional()
});

export const PaginationResponseSchema = z.object({
  hasMore: z.boolean(),
  nextCursor: z.string().optional()
});

/**
 * File upload patterns
 */
export const PresignedUrlRequestSchema = z.object({
  fileType: ImageFileTypeField,
  purpose: UploadPurposeField
});

export const PresignedUrlResponseSchema = z.object({
  uploadUrl: URLField,
  publicUrl: URLField,
  thumbnailUrl: OptionalURLField,
  expiresIn: z.number().positive()
});

/**
 * Common utility types
 */
export type UUID = z.infer<typeof UUIDField>;
export type Timestamp = z.infer<typeof TimestampField>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
export type MessageResponse = z.infer<typeof MessageResponseSchema>;
export type PaginationRequest = z.infer<typeof PaginationRequestSchema>;
export type PaginationResponse = z.infer<typeof PaginationResponseSchema>;
export type PresignedUrlRequest = z.infer<typeof PresignedUrlRequestSchema>;
export type PresignedUrlResponse = z.infer<typeof PresignedUrlResponseSchema>;