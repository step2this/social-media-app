'use server';

import { revalidatePath } from 'next/cache';
import { getGraphQLClient } from '@/lib/graphql/client';
import { FOLLOW_USER, UNFOLLOW_USER } from '@/lib/graphql/queries';
import { logger, logServerAction } from '@/lib/logger';

interface FollowResponse {
  success: boolean;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}

interface FollowUserResponse {
  followUser: FollowResponse;
}

interface UnfollowUserResponse {
  unfollowUser: FollowResponse;
}

export async function followUser(userId: string): Promise<FollowResponse> {
  try {
    logger.info({ userId }, 'Following user');

    const client = await getGraphQLClient();
    const data = await client.request<FollowUserResponse>(FOLLOW_USER, { userId });

    // Revalidate all profile pages and feeds
    revalidatePath('/(app)', 'layout');

    logServerAction('followUser', { userId, followersCount: data.followUser.followersCount }, 'success');
    return data.followUser;
  } catch (error) {
    logger.error({ userId, error }, 'Failed to follow user');
    logServerAction('followUser', { userId }, 'error');
    return {
      success: false,
      followersCount: 0,
      followingCount: 0,
      isFollowing: false,
    };
  }
}

export async function unfollowUser(userId: string): Promise<FollowResponse> {
  try {
    logger.info({ userId }, 'Unfollowing user');

    const client = await getGraphQLClient();
    const data = await client.request<UnfollowUserResponse>(UNFOLLOW_USER, { userId });

    // Revalidate all profile pages and feeds
    revalidatePath('/(app)', 'layout');

    logServerAction('unfollowUser', { userId, followersCount: data.unfollowUser.followersCount }, 'success');
    return data.unfollowUser;
  } catch (error) {
    logger.error({ userId, error }, 'Failed to unfollow user');
    logServerAction('unfollowUser', { userId }, 'error');
    return {
      success: false,
      followersCount: 0,
      followingCount: 0,
      isFollowing: false,
    };
  }
}
