/**
 * UpdatePost Use Case
 *
 * Updates an existing post's caption.
 * This is the business logic layer between resolvers and services.
 *
 * Business Rules:
 * - User must be authenticated
 * - User must own the post
 * - Can only update caption (not image)
 *
 * Benefits:
 * - 100% unit testable (mock services)
 * - Contains all business logic in one place
 * - Reusable across different interfaces
 * - Type-safe with Result type
 */

import { AsyncResult, UserId, PostId } from '../../../shared/types/index.js';

/**
 * Input for UpdatePost use case
 */
export interface UpdatePostInput {
  /**
   * The post ID to update
   */
  postId: PostId;

  /**
   * The authenticated user's ID (must be post owner)
   */
  userId: UserId;

  /**
   * Updated caption (optional)
   */
  caption?: string;
}

/**
 * Output post data
 */
export interface UpdatePostOutput {
  id: string;
  userId: string;
  imageUrl: string;
  thumbnailUrl: string;
  caption: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Service interface needed by this use case
 */
export interface UpdatePostServices {
  postService: {
    updatePost(
      postId: string,
      userId: string,
      data: { caption?: string }
    ): Promise<UpdatePostOutput | null>;
  };
}

/**
 * UpdatePost - Use case for updating a post
 *
 * This use case encapsulates the business logic for updating a post.
 * The service handles ownership validation.
 */
export class UpdatePost {
  constructor(private readonly services: UpdatePostServices) {}

  /**
   * Execute the use case.
   *
   * Flow:
   * 1. Update post via service (handles ownership check)
   * 2. Return updated post or error
   *
   * @param input - The use case input
   * @returns AsyncResult with updated post on success, or Error on failure
   */
  async execute(input: UpdatePostInput): AsyncResult<UpdatePostOutput> {
    try {
      const result = await this.services.postService.updatePost(
        input.postId,
        input.userId,
        {
          caption: input.caption,
        }
      );

      if (!result) {
        return {
          success: false,
          error: new Error('Post not found or you do not have permission to update it'),
        };
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to update post'),
      };
    }
  }
}
