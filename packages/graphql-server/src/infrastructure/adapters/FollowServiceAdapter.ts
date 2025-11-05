/**
 * FollowServiceAdapter
 *
 * Adapts external follow service to domain repository interface.
 * Uses shared adapter helpers for DRY error handling.
 */

import type { IFollowRepository, FollowStatus } from '../../domain/repositories/IFollowRepository';
import type { FollowService } from '@social-media-app/dal';
import type { Result } from '../../shared/types/result';
import { adaptServiceCall } from './shared/AdapterHelpers';

export class FollowServiceAdapter implements IFollowRepository {
  constructor(private readonly followService: FollowService) {}

  async getFollowStatus(
    followerId: string,
    followeeId: string
  ): Promise<Result<FollowStatus, Error>> {
    return adaptServiceCall(() => this.followService.getFollowStatus(followerId, followeeId));
  }
}
