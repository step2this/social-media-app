/**
 * Follow Repository Interface
 *
 * Domain interface for follow relationship data access.
 * Adapter implementations handle the translation from external services.
 */

import type { Result } from '../../shared/types/result.js';

export interface FollowStatus {
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
}

export interface IFollowRepository {
  getFollowStatus(
    followerId: string,
    followeeId: string
  ): Promise<Result<FollowStatus, Error>>;
}
