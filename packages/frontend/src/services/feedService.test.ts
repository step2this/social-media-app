import { describe, it, expect, vi, beforeEach } from 'vitest';
import { feedService } from './feedService';
import { apiClient } from './apiClient';
import type { MarkFeedItemsAsReadResponse } from '@social-media-app/shared';

vi.mock('./apiClient');

describe('feedService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFeedPosts', () => {
    it('should fetch feed posts with default limit', async () => {
      const mockResponse = {
        posts: [],
        hasMore: false,
        totalCount: 0
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await feedService.getFeedPosts();

      expect(apiClient.get).toHaveBeenCalledWith('/feed/explore?limit=24');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch feed posts with custom limit and cursor', async () => {
      const mockResponse = {
        posts: [],
        hasMore: true,
        cursor: 'next-cursor'
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await feedService.getFeedPosts(12, 'cursor-123');

      expect(apiClient.get).toHaveBeenCalledWith('/feed/explore?limit=12&cursor=cursor-123');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getFollowingFeed', () => {
    it('should fetch following feed with authentication', async () => {
      const mockResponse = {
        posts: [],
        hasMore: false
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await feedService.getFollowingFeed();

      expect(apiClient.get).toHaveBeenCalledWith('/feed/following?limit=24');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('markPostsAsRead', () => {
    it('should call POST /feed/read with postIds', async () => {
      const mockResponse: MarkFeedItemsAsReadResponse = {
        success: true,
        markedCount: 3
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const postIds = ['post-1', 'post-2', 'post-3'];
      const result = await feedService.markPostsAsRead(postIds);

      expect(apiClient.post).toHaveBeenCalledWith('/feed/read', { postIds });
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty array gracefully', async () => {
      const mockResponse: MarkFeedItemsAsReadResponse = {
        success: true,
        markedCount: 0
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const result = await feedService.markPostsAsRead([]);

      expect(apiClient.post).toHaveBeenCalledWith('/feed/read', { postIds: [] });
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Network error'));

      await expect(feedService.markPostsAsRead(['post-1'])).rejects.toThrow('Network error');
    });

    it('should handle 401 Unauthorized errors', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).status = 401;

      vi.mocked(apiClient.post).mockRejectedValueOnce(authError);

      await expect(feedService.markPostsAsRead(['post-1'])).rejects.toThrow('Unauthorized');
    });

    it('should handle 500 Internal Server errors', async () => {
      const serverError = new Error('Internal Server Error');
      (serverError as any).status = 500;

      vi.mocked(apiClient.post).mockRejectedValueOnce(serverError);

      await expect(feedService.markPostsAsRead(['post-1'])).rejects.toThrow('Internal Server Error');
    });

    it('should handle validation errors for invalid UUIDs', async () => {
      const validationError = new Error('Invalid UUID format');
      (validationError as any).status = 400;
      (validationError as any).code = 'VALIDATION_ERROR';

      vi.mocked(apiClient.post).mockRejectedValueOnce(validationError);

      await expect(feedService.markPostsAsRead(['invalid-id'])).rejects.toThrow('Invalid UUID format');
    });

    it('should handle batch size limit (max 50 posts)', async () => {
      const mockResponse: MarkFeedItemsAsReadResponse = {
        success: true,
        markedCount: 50
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const postIds = Array.from({ length: 50 }, (_, i) => `post-${i}`);
      const result = await feedService.markPostsAsRead(postIds);

      expect(apiClient.post).toHaveBeenCalledWith('/feed/read', { postIds });
      expect(result.markedCount).toBe(50);
    });
  });
});
