import { apiClient } from './apiClient';
import type { FeedResponse, PostGridResponse } from '@social-media-app/shared';

/**
 * Feed service for frontend API calls
 */
export const feedService = {
  /**
   * Get feed/explore posts (all public posts from all users)
   */
  async getFeedPosts(
    limit: number = 24,
    cursor?: string
  ): Promise<PostGridResponse> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (cursor) {
      params.append('cursor', cursor);
    }

    const response = await apiClient.get<PostGridResponse>(
      `/feed?${params.toString()}`
    );
    return response;
  },

  /**
   * Get following feed posts (posts from users you follow)
   * Requires authentication
   */
  async getFollowingFeed(
    limit: number = 24,
    cursor?: string
  ): Promise<FeedResponse> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (cursor) {
      params.append('cursor', cursor);
    }

    const response = await apiClient.get<FeedResponse>(
      `/feed/following?${params.toString()}`
    );
    return response;
  }
};
