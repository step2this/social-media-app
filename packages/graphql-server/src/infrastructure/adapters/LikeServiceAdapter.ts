/**
 * LikeServiceAdapter
 *
 * Adapts external like service to domain repository interface.
 * Transforms DAL LikeStatus (likesCount) to Domain LikeStatus (likeCount).
 *
 * Advanced TypeScript Pattern: Property Renaming Transformation
 * Maps likesCount → likeCount for domain consistency
 */

import type { ILikeRepository, LikeStatus } from '../../domain/repositories/ILikeRepository';
import type { LikeService } from '@social-media-app/dal';
import type { Result } from '../../shared/types/result';
import { adaptServiceCall } from './shared/AdapterHelpers';

/**
 * Type representing DAL's LikeStatus (uses likesCount)
 */
type DALLikeStatus = {
  isLiked: boolean;
  likesCount: number;
};

export class LikeServiceAdapter implements ILikeRepository {
  constructor(private readonly likeService: LikeService) {}

  async getPostLikeStatus(userId: string, postId: string): Promise<Result<LikeStatus, Error>> {
    // Get DAL response with likesCount
    const result = await adaptServiceCall<DALLikeStatus>(
      () => this.likeService.getPostLikeStatus(userId, postId)
    );

    // Transform likesCount → likeCount for domain
    if (result.success) {
      const domainStatus: LikeStatus = {
        isLiked: result.data.isLiked,
        likeCount: result.data.likesCount, // Property rename transformation
      };
      return { success: true, data: domainStatus };
    }

    // Error case - pass through
    return { success: false, error: (result as { success: false; error: Error }).error };
  }
}
