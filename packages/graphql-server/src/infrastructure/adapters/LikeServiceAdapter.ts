/**
 * LikeServiceAdapter
 *
 * Adapts external like service to domain repository interface.
 * Uses shared adapter helpers for DRY error handling.
 */

import type { ILikeRepository, LikeStatus } from '../../domain/repositories/ILikeRepository';
import type { ILikeService } from '@social-media-app/dal';
import type { Result } from '../../shared/types/result';
import { adaptServiceCall } from './shared/AdapterHelpers';

export class LikeServiceAdapter implements ILikeRepository {
  constructor(private readonly likeService: ILikeService) {}

  async getPostLikeStatus(userId: string, postId: string): Promise<Result<LikeStatus, Error>> {
    return adaptServiceCall(() => this.likeService.getPostLikeStatus(userId, postId));
  }
}
