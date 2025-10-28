/**
 * Follow Service GraphQL Implementation
 * Handles follow/unfollow operations via GraphQL
 */

import type { IGraphQLClient } from '../../graphql/interfaces/IGraphQLClient.js';
import type { IFollowService, FollowStatus } from '../interfaces/IFollowService.js';
import type { AsyncState } from '../../graphql/types.js';
import {
  FOLLOW_USER_MUTATION,
  UNFOLLOW_USER_MUTATION,
  GET_FOLLOW_STATUS_QUERY,
  type FollowUserResponse,
  type UnfollowUserResponse,
  type GetFollowStatusResponse,
} from '../../graphql/operations/follows.js';

/**
 * GraphQL implementation of Follow Service
 */
export class FollowServiceGraphQL implements IFollowService {
  constructor(private graphqlClient: IGraphQLClient) {}

  /**
   * Get follow status for a user
   */
  async getFollowStatus(userId: string): Promise<AsyncState<FollowStatus>> {
    const result = await this.graphqlClient.query<GetFollowStatusResponse>(
      GET_FOLLOW_STATUS_QUERY,
      { userId }
    );

    if (result.status !== 'success') {
      return result;
    }

    return {
      status: 'success',
      data: {
        isFollowing: result.data.followStatus.isFollowing,
        followersCount: result.data.followStatus.followersCount,
        followingCount: result.data.followStatus.followingCount,
      },
    };
  }

  /**
   * Follow a user
   */
  async followUser(userId: string): Promise<AsyncState<FollowStatus>> {
    const result = await this.graphqlClient.mutate<FollowUserResponse>(
      FOLLOW_USER_MUTATION,
      { userId }
    );

    if (result.status !== 'success') {
      return result;
    }

    return {
      status: 'success',
      data: {
        isFollowing: result.data.followUser.isFollowing,
        followersCount: result.data.followUser.followersCount,
        followingCount: result.data.followUser.followingCount,
      },
    };
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(userId: string): Promise<AsyncState<FollowStatus>> {
    const result = await this.graphqlClient.mutate<UnfollowUserResponse>(
      UNFOLLOW_USER_MUTATION,
      { userId }
    );

    if (result.status !== 'success') {
      return result;
    }

    return {
      status: 'success',
      data: {
        isFollowing: result.data.unfollowUser.isFollowing,
        followersCount: result.data.unfollowUser.followersCount,
        followingCount: result.data.unfollowUser.followingCount,
      },
    };
  }
}
