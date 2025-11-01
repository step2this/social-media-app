/**
 * GetPostLikeStatus Use Case
 *
 * Retrieves the like status for a specific post by a user.
 * Delegates to repository implementation for data access.
 */

import type { ILikeRepository, LikeStatus } from '../../../domain/repositories/ILikeRepository';
import type { Result } from '../../../shared/types/result';

export class GetPostLikeStatus {
  constructor(private readonly likeRepository: ILikeRepository) {}

  async execute(userId: string, postId: string): Promise<Result<LikeStatus, Error>> {
    return this.likeRepository.getPostLikeStatus(userId, postId);
  }
}
