/**
 * Like Repository Interface
 *
 * Domain interface for like/reaction data access.
 * Adapter implementations handle the translation from external services.
 */

import type { Result } from '../../shared/types/result.js';

export interface LikeStatus {
  isLiked: boolean;
  likeCount: number;
}

export interface ILikeRepository {
  getPostLikeStatus(userId: string, postId: string): Promise<Result<LikeStatus, Error>>;
}
