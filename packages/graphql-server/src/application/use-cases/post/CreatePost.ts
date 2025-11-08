/**
 * CreatePost Use Case
 *
 * Creates a new social media post with image upload.
 * This is the business logic layer between resolvers and services.
 *
 * Business Rules:
 * - User must be authenticated
 * - Must provide valid file type for image
 * - Caption is optional
 * - Returns post with presigned S3 upload URLs
 *
 * Benefits:
 * - 100% unit testable (mock services)
 * - Contains all business logic in one place
 * - Reusable across different interfaces (GraphQL, REST, etc.)
 * - Type-safe with Result type
 * - No GraphQL dependencies
 */

import { AsyncResult, UserId } from '../../../shared/types/index.js';

/**
 * File type for image uploads
 */
export type ImageFileType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

/**
 * Input for CreatePost use case
 */
export interface CreatePostInput {
  /**
   * The authenticated user's ID
   */
  userId: UserId;

  /**
   * The file type for the image
   */
  fileType: ImageFileType;

  /**
   * Optional caption for the post
   */
  caption?: string;
}

/**
 * Output for CreatePost use case
 */
export interface CreatePostOutput {
  /**
   * The created post
   */
  post: {
    id: string;
    userId: string;
    imageUrl: string;
    thumbnailUrl: string;
    caption: string | null;
    likesCount: number;
    commentsCount: number;
    createdAt: string;
    updatedAt: string;
  };

  /**
   * Presigned S3 URL for uploading the full-size image
   */
  uploadUrl: string;

  /**
   * Presigned S3 URL for uploading the thumbnail image
   */
  thumbnailUploadUrl: string;
}

/**
 * Service interfaces needed by this use case
 */
export interface CreatePostServices {
  profileService: {
    getProfileById(userId: string): Promise<{ handle: string } | null>;
    generatePresignedUrl(
      userId: string,
      options: { fileType: ImageFileType; purpose: string }
    ): Promise<{
      uploadUrl: string;
      publicUrl: string;
      thumbnailUrl?: string;
    }>;
  };
  postService: {
    createPost(
      userId: string,
      handle: string,
      data: { fileType: ImageFileType; caption?: string },
      imageUrl: string,
      thumbnailUrl: string
    ): Promise<{
      id: string;
      userId: string;
      imageUrl: string;
      thumbnailUrl: string;
      caption: string | null;
      likesCount: number;
      commentsCount: number;
      createdAt: string;
      updatedAt: string;
    }>;
  };
}

/**
 * CreatePost - Use case for creating a new post
 *
 * This use case encapsulates the business logic for creating a post with image upload.
 * It orchestrates profile lookup, presigned URL generation, and post creation.
 */
export class CreatePost {
  /**
   * Creates a CreatePost use case.
   *
   * @param services - The required services (profileService, postService)
   */
  constructor(private readonly services: CreatePostServices) {}

  /**
   * Execute the use case.
   *
   * Flow:
   * 1. Get user profile to obtain handle
   * 2. Generate presigned S3 URLs for image upload
   * 3. Create post placeholder with public URLs
   * 4. Return post with upload URLs for client
   *
   * @param input - The use case input
   * @returns AsyncResult with CreatePostOutput on success, or Error on failure
   */
  async execute(input: CreatePostInput): AsyncResult<CreatePostOutput> {
    try {
      // Step 1: Get user profile to get handle
      const userProfile = await this.services.profileService.getProfileById(input.userId);

      if (!userProfile) {
        return {
          success: false,
          error: new Error('User profile not found'),
        };
      }

      // Step 2: Generate presigned URLs for image upload
      const imageUploadData = await this.services.profileService.generatePresignedUrl(
        input.userId,
        {
          fileType: input.fileType,
          purpose: 'post-image',
        }
      );

      // Step 3: Create post placeholder with presigned URLs
      const post = await this.services.postService.createPost(
        input.userId,
        userProfile.handle,
        {
          fileType: input.fileType,
          caption: input.caption,
        },
        imageUploadData.publicUrl,
        imageUploadData.thumbnailUrl || imageUploadData.publicUrl
      );

      // Success: Return post with upload URLs
      return {
        success: true,
        data: {
          post,
          uploadUrl: imageUploadData.uploadUrl,
          thumbnailUploadUrl: imageUploadData.thumbnailUrl || imageUploadData.uploadUrl,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to create post'),
      };
    }
  }
}
