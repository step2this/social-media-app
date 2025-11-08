/**
 * LikePost Use Case
 *
 * Likes a post for the authenticated user.
 */

import { AsyncResult, UserId, PostId } from '../../../shared/types/index.js';

export interface LikePostInput {
  userId: UserId;
  postId: PostId;
}

export interface LikePostOutput {
  success: boolean;
  isLiked: boolean;
  likesCount: number;
}

export interface LikePostServices {
  likeService: {
    likePost(userId: string, postId: string, postUserId: string, postSK: string): Promise<LikePostOutput>;
  };
}

export class LikePost {
  constructor(private readonly services: LikePostServices) {}

  async execute(input: LikePostInput): AsyncResult<LikePostOutput> {
    try {
      const result = await this.services.likeService.likePost(
        input.userId,
        input.postId,
        '', // postUserId - service will fetch
        ''  // postSK - service will fetch
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to like post'),
      };
    }
  }
}
