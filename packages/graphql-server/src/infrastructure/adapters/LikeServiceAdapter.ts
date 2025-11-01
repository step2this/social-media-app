/**
 * LikeServiceAdapter
 *
 * Adapts external like service to domain repository interface.
 * Uses shared adapter helpers for DRY error handling.
 */

import type { ILikeRepository } from '../../domain/repositories/ILikeRepository';
import type { ILikeService } from '@social-media-app/dal';
import { adaptServiceCall } from './shared/AdapterHelpers';

export class LikeServiceAdapter implements ILikeRepository {
  constructor(private readonly likeService: ILikeService) {}

  async getPostLikeStatus(userId: string, postId: string) {
    return adaptServiceCall(() => this.likeService.getPostLikeStatus(userId, postId));
  }
}
