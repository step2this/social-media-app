/**
 * FollowUser Use Case
 *
 * Follows another user.
 */

import { AsyncResult, UserId } from '../../../shared/types/index.js';

export interface FollowUserInput {
  followerId: UserId;
  followeeId: UserId;
}

export interface FollowUserOutput {
  success: boolean;
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
}

export interface FollowUserServices {
  followService: {
    followUser(followerId: string, followeeId: string): Promise<FollowUserOutput>;
  };
}

export class FollowUser {
  constructor(private readonly services: FollowUserServices) {}

  async execute(input: FollowUserInput): AsyncResult<FollowUserOutput> {
    // Business Rule: Cannot follow yourself
    if (input.followerId === input.followeeId) {
      return {
        success: false,
        error: new Error('You cannot follow yourself'),
      };
    }

    try {
      const result = await this.services.followService.followUser(
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
        error: error instanceof Error ? error : new Error('Failed to follow user'),
      };
    }
  }
}
