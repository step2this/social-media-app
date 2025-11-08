/**
 * UnfollowUser Use Case
 *
 * Unfollows another user.
 */

import { AsyncResult, UserId } from '../../../shared/types/index.js';

export interface UnfollowUserInput {
  followerId: UserId;
  followeeId: UserId;
}

export interface UnfollowUserOutput {
  success: boolean;
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
}

export interface UnfollowUserServices {
  followService: {
    unfollowUser(followerId: string, followeeId: string): Promise<UnfollowUserOutput>;
  };
}

export class UnfollowUser {
  constructor(private readonly services: UnfollowUserServices) {}

  async execute(input: UnfollowUserInput): AsyncResult<UnfollowUserOutput> {
    try {
      const result = await this.services.followService.unfollowUser(
        input.followerId,
        input.followeeId
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to unfollow user'),
      };
    }
  }
}
