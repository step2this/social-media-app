/**
 * S3 Helpers
 *
 * Shared utility functions for generating S3 keys, public URLs, and presigned upload URLs.
 * These functions are used across the application for consistent S3 file management.
 *
 * @module s3-helpers
 */

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';

/**
 * Generate a random UUID using the browser's crypto API or Node.js crypto module
 * This function works in both browser and Node.js environments
 */
function generateUUID(): string {
  // Browser environment
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Node.js environment
  if (typeof require !== 'undefined') {
    const { randomUUID } = require('crypto');
    return randomUUID();
  }

  // Fallback (should never reach here in modern environments)
  throw new Error('No UUID generation method available');
}

/**
 * Upload purpose discriminated union type
 * - profile-picture: User profile pictures (with thumbnail)
 * - post-image: Post images (with thumbnail)
 * - auction-image: Auction images (no thumbnail)
 */
export type UploadPurpose = 'profile-picture' | 'post-image' | 'auction-image';

/**
 * Supported image MIME types
 */
export type ImageFileType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

/**
 * Configuration for building S3 keys
 */
export interface BuildS3KeyConfig {
  /** User ID for the key path */
  readonly userId: string;
  /** Upload purpose determines the folder structure */
  readonly purpose: UploadPurpose;
  /** File extension (without dot) */
  readonly fileExtension: string;
  /** Unique identifier for the file (default: auto-generated UUID) */
  readonly uniqueId: string;
  /** Whether this is a thumbnail variant */
  readonly isThumbnail?: boolean;
}

/**
 * Configuration for building public URLs
 */
export interface BuildPublicUrlConfig {
  /** S3 key for the file */
  readonly key: string;
  /** CloudFront domain (if available, preferred over S3 direct) */
  readonly cloudFrontDomain?: string;
  /** S3 bucket name (used for direct S3 URLs) */
  readonly bucketName: string;
}

/**
 * Configuration for generating presigned upload URLs
 */
export interface GeneratePresignedUploadUrlConfig {
  /** S3 client instance */
  readonly s3Client: S3Client;
  /** S3 bucket name */
  readonly bucketName: string;
  /** User ID for the upload */
  readonly userId: string;
  /** MIME type of the file */
  readonly fileType: string;
  /** Upload purpose determines folder and thumbnail behavior */
  readonly purpose: UploadPurpose;
  /** CloudFront domain for public URLs (optional) */
  readonly cloudFrontDomain?: string;
  /** URL expiration time in seconds (default: 3600) */
  readonly expiresIn?: number;
}

/**
 * Response from presigned URL generation
 */
export interface PresignedUploadUrlResponse {
  /** Presigned URL for uploading the file */
  readonly uploadUrl: string;
  /** Public URL for accessing the uploaded file */
  readonly publicUrl: string;
  /** Public URL for the thumbnail (if applicable) */
  readonly thumbnailUrl?: string;
  /** S3 key for the uploaded file */
  readonly key: string;
  /** URL expiration time in seconds */
  readonly expiresIn: number;
}

/**
 * Maps upload purpose to S3 folder name
 */
const PURPOSE_FOLDER_MAP: Record<UploadPurpose, string> = {
  'profile-picture': 'profile',
  'post-image': 'posts',
  'auction-image': 'auctions',
} as const;

/**
 * Determines if a purpose supports thumbnail generation
 */
const SUPPORTS_THUMBNAIL: Record<UploadPurpose, boolean> = {
  'profile-picture': true,
  'post-image': true,
  'auction-image': false,
} as const;

/**
 * Builds an S3 key following the standard format:
 * users/{userId}/{purpose-folder}/{uniqueId}.{extension}
 *
 * For thumbnails, appends '_thumb' before the extension:
 * users/{userId}/{purpose-folder}/{uniqueId}_thumb.{extension}
 *
 * @param config - Configuration for building the S3 key
 * @returns S3 key string
 *
 * @example
 * ```typescript
 * const key = buildS3Key({
 *   userId: 'user-123',
 *   purpose: 'profile-picture',
 *   fileExtension: 'jpg',
 *   uniqueId: 'abc-def-123'
 * });
 * // Returns: 'users/user-123/profile/abc-def-123.jpg'
 * ```
 */
export function buildS3Key(config: BuildS3KeyConfig): string {
  const { userId, purpose, fileExtension, uniqueId, isThumbnail = false } = config;

  const folder = PURPOSE_FOLDER_MAP[purpose];
  const filename = isThumbnail ? `${uniqueId}_thumb.${fileExtension}` : `${uniqueId}.${fileExtension}`;

  return `users/${userId}/${folder}/${filename}`;
}

/**
 * Builds a public URL for an S3 object.
 * Prefers CloudFront URL when domain is provided, falls back to direct S3 URL.
 *
 * CloudFront format: https://{domain}/{key}
 * S3 format: https://{bucket}.s3.amazonaws.com/{key}
 *
 * @param config - Configuration for building the public URL
 * @returns Public URL string
 *
 * @example
 * ```typescript
 * // With CloudFront
 * const url = buildPublicUrl({
 *   key: 'users/user-123/profile/image.jpg',
 *   cloudFrontDomain: 'd111111abcdef8.cloudfront.net',
 *   bucketName: 'my-bucket'
 * });
 * // Returns: 'https://d111111abcdef8.cloudfront.net/users/user-123/profile/image.jpg'
 *
 * // Without CloudFront (direct S3)
 * const url = buildPublicUrl({
 *   key: 'users/user-123/posts/image.png',
 *   bucketName: 'my-bucket'
 * });
 * // Returns: 'https://my-bucket.s3.amazonaws.com/users/user-123/posts/image.png'
 * ```
 */
export function buildPublicUrl(config: BuildPublicUrlConfig): string {
  const { key, cloudFrontDomain, bucketName } = config;

  if (cloudFrontDomain) {
    return `https://${cloudFrontDomain}/${key}`;
  }

  return `https://${bucketName}.s3.amazonaws.com/${key}`;
}

/**
 * Generates a presigned upload URL for S3 with associated public URLs.
 *
 * This function:
 * 1. Validates required parameters
 * 2. Extracts file extension from MIME type
 * 3. Generates unique S3 key
 * 4. Creates presigned upload URL
 * 5. Generates public URLs (including thumbnail if applicable)
 *
 * Thumbnail URLs are generated for:
 * - profile-picture
 * - post-image
 *
 * But NOT for:
 * - auction-image
 *
 * @param config - Configuration for generating presigned URL
 * @returns Promise resolving to presigned URL response
 * @throws Error if bucket name is empty
 * @throws Error if user ID is empty
 * @throws Error if file type format is invalid
 *
 * @example
 * ```typescript
 * const result = await generatePresignedUploadUrl({
 *   s3Client: myS3Client,
 *   bucketName: 'my-bucket',
 *   userId: 'user-123',
 *   fileType: 'image/jpeg',
 *   purpose: 'profile-picture',
 *   cloudFrontDomain: 'd111111abcdef8.cloudfront.net',
 *   expiresIn: 3600
 * });
 *
 * // Upload file to result.uploadUrl
 * // Access file at result.publicUrl
 * // Access thumbnail at result.thumbnailUrl (if applicable)
 * ```
 */
export async function generatePresignedUploadUrl(
  config: GeneratePresignedUploadUrlConfig
): Promise<PresignedUploadUrlResponse> {
  const {
    s3Client,
    bucketName,
    userId,
    fileType,
    purpose,
    cloudFrontDomain,
    expiresIn = 3600,
  } = config;

  // Validate required parameters
  if (!bucketName || bucketName.trim() === '') {
    throw new Error('S3 bucket name is required');
  }

  if (!userId || userId.trim() === '') {
    throw new Error('User ID is required');
  }

  // Validate and extract file extension from MIME type
  const parts = fileType.split('/');
  if (parts.length !== 2 || parts[0] !== 'image') {
    throw new Error('Invalid file type format');
  }

  const fileExtension = parts[1];
  const uniqueId = generateUUID();

  // Build S3 key for main file
  const key = buildS3Key({
    userId,
    purpose,
    fileExtension,
    uniqueId,
    isThumbnail: false,
  });

  // Generate presigned upload URL
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

  // Build public URL
  const publicUrl = buildPublicUrl({
    key,
    cloudFrontDomain,
    bucketName,
  });

  // Build thumbnail URL if purpose supports thumbnails
  let thumbnailUrl: string | undefined;
  if (SUPPORTS_THUMBNAIL[purpose]) {
    const thumbnailKey = buildS3Key({
      userId,
      purpose,
      fileExtension,
      uniqueId,
      isThumbnail: true,
    });

    thumbnailUrl = buildPublicUrl({
      key: thumbnailKey,
      cloudFrontDomain,
      bucketName,
    });
  }

  return {
    uploadUrl,
    publicUrl,
    thumbnailUrl,
    key,
    expiresIn,
  };
}
