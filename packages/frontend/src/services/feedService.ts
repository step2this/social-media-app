import { apiClient } from './apiClient';
import type { FeedResponse, PostGridResponse, MarkFeedItemsAsReadResponse } from '@social-media-app/shared';

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
  },

  /**
   * Mark posts as read (Instagram-like behavior)
   * Posts marked as read will not appear in future feed requests
   *
   * @param postIds - Array of post IDs to mark as read (max 50)
   * @returns Response with success status and count of marked posts
   * @throws {Error} Network errors, authentication errors, validation errors
   */
  async markPostsAsRead(postIds: string[]): Promise<MarkFeedItemsAsReadResponse> {
    const response = await apiClient.post<MarkFeedItemsAsReadResponse>(
      '/feed/read',
      { postIds }
    );
    return response;
  }
};
