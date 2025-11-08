/**
 * UnlikePost Use Case
 *
 * Unlikes a post for the authenticated user.
 */

import { AsyncResult, UserId, PostId } from '../../../shared/types/index.js';

export interface UnlikePostInput {
  userId: UserId;
  postId: PostId;
}

export interface UnlikePostOutput {
  success: boolean;
  isLiked: boolean;
  likesCount: number;
}

export interface UnlikePostServices {
  likeService: {
    unlikePost(userId: string, postId: string): Promise<UnlikePostOutput>;
  };
}

export class UnlikePost {
  constructor(private readonly services: UnlikePostServices) {}

  async execute(input: UnlikePostInput): AsyncResult<UnlikePostOutput> {
    try {
      const result = await this.services.likeService.unlikePost(
        input.userId,
        input.postId
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to unlike post'),
      };
    }
  }
}
