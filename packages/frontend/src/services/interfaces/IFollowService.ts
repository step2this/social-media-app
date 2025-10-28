/**
 * Follow Service Interface
 * Defines the contract for follow/unfollow operations
 */

import type { AsyncState } from '../../graphql/types.js';

export interface FollowStatus {
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
}

export interface IFollowService {
  /**
   * Get follow status for a user
   * @param userId - ID of the user to check follow status for
   */
  getFollowStatus(userId: string): Promise<AsyncState<FollowStatus>>;

  /**
   * Follow a user
   * @param userId - ID of the user to follow
   */
  followUser(userId: string): Promise<AsyncState<FollowStatus>>;

  /**
   * Unfollow a user
   * @param userId - ID of the user to unfollow
   */
  unfollowUser(userId: string): Promise<AsyncState<FollowStatus>>;
}
