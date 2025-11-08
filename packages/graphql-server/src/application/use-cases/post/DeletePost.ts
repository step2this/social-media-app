/**
 * DeletePost Use Case
 *
 * Deletes an existing post.
 * This is the business logic layer between resolvers and services.
 *
 * Business Rules:
 * - User must be authenticated
 * - User must own the post
 * - Deletion cascades to comments, likes, etc.
 *
 * Benefits:
 * - 100% unit testable (mock services)
 * - Contains all business logic in one place
 * - Reusable across different interfaces
 * - Type-safe with Result type
 */

import { AsyncResult, UserId, PostId } from '../../../shared/types/index.js';

/**
 * Input for DeletePost use case
 */
export interface DeletePostInput {
  /**
   * The post ID to delete
   */
  postId: PostId;

  /**
   * The authenticated user's ID (must be post owner)
   */
  userId: UserId;
}

/**
 * Output for DeletePost use case
 */
export interface DeletePostOutput {
  success: boolean;
}

/**
 * Service interface needed by this use case
 */
export interface DeletePostServices {
  postService: {
    deletePost(postId: string, userId: string): Promise<boolean>;
  };
}

/**
 * DeletePost - Use case for deleting a post
 *
 * This use case encapsulates the business logic for deleting a post.
 * The service handles ownership validation and cascade deletion.
 */
export class DeletePost {
  constructor(private readonly services: DeletePostServices) {}

  /**
   * Execute the use case.
   *
   * Flow:
   * 1. Delete post via service (handles ownership check)
   * 2. Return success status or error
   *
   * @param input - The use case input
   * @returns AsyncResult with success status on success, or Error on failure
   */
  async execute(input: DeletePostInput): AsyncResult<DeletePostOutput> {
    try {
      const success = await this.services.postService.deletePost(
        input.postId,
        input.userId
      );

      if (!success) {
        return {
          success: false,
          error: new Error('Post not found or you do not have permission to delete it'),
        };
      }

      return {
        success: true,
        data: { success: true },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to delete post'),
      };
    }
  }
}
