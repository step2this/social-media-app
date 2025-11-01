/**
 * FollowServiceAdapter
 *
 * Adapts external follow service to domain repository interface.
 * Uses shared adapter helpers for DRY error handling.
 */

import type { IFollowRepository } from '../../domain/repositories/IFollowRepository';
import type { IFollowService } from '@social-media-app/dal';
import { adaptServiceCall } from './shared/AdapterHelpers';

export class FollowServiceAdapter implements IFollowRepository {
  constructor(private readonly followService: IFollowService) {}

  async getFollowStatus(followerId: string, followeeId: string) {
    return adaptServiceCall(() => this.followService.getFollowStatus(followerId, followeeId));
  }
}
