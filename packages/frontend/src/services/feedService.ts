import { apiClient } from './apiClient';
import type { FeedResponse } from '@social-media-app/shared';

/**
 * Feed service for frontend API calls
 */
export const feedService = {
  /**
   * Get feed/explore posts
   */
  async getFeedPosts(
    limit: number = 24,
    cursor?: string
  ): Promise<FeedResponse> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (cursor) {
      params.append('cursor', cursor);
    }

    const response = await apiClient.get<FeedResponse>(
      `/feed?${params.toString()}`
    );
    return response;
  }
};
