/**
 * FeedServiceAdapter Tests
 *
 * TDD for FeedService adapter following established patterns.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FeedService } from '@social-media-app/dal';
import { FeedServiceAdapter } from '../FeedServiceAdapter.js';
import { UserId } from '../../../shared/types/index.js';
import type { Post } from '../../../domain/repositories/IPostRepository.js';

describe('FeedServiceAdapter', () => {
  let mockFeedService: FeedService;
  let adapter: FeedServiceAdapter;

  beforeEach(() => {
    mockFeedService = {
      getFollowingFeed: vi.fn(),
      getExploreFeed: vi.fn(),
    } as unknown as FeedService;

    adapter = new FeedServiceAdapter(mockFeedService);
  });

  describe('getFollowingFeed()', () => {
    it('should return paginated following feed', async () => {
      const mockPosts: Post[] = [
        {
          id: 'post-1',
          userId: 'user-123',
          imageUrl: 'https://example.com/1.jpg',
          caption: 'Following post 1',
          likesCount: 15,
          commentsCount: 3,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      vi.mocked(mockFeedService.getFollowingFeed).mockResolvedValue({
        posts: mockPosts,
        hasMore: true,
      });

      const result = await adapter.getFollowingFeed(UserId('user-123'), { first: 10 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.edges).toHaveLength(1);
        expect(result.data.pageInfo.hasNextPage).toBe(true);
        expect(result.data.edges[0].node.caption).toBe('Following post 1');
      }
    });

    it('should handle empty feed', async () => {
      vi.mocked(mockFeedService.getFollowingFeed).mockResolvedValue({
        posts: [],
        hasMore: false,
      });

      const result = await adapter.getFollowingFeed(UserId('user-123'), { first: 10 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.edges).toHaveLength(0);
        expect(result.data.pageInfo.hasNextPage).toBe(false);
      }
    });

    it('should return error when service throws', async () => {
      const error = new Error('Feed error');
      vi.mocked(mockFeedService.getFollowingFeed).mockRejectedValue(error);

      const result = await adapter.getFollowingFeed(UserId('user-123'), { first: 10 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(error);
      }
    });
  });

  describe('getExploreFeed()', () => {
    it('should return paginated explore feed', async () => {
      const mockPosts: Post[] = [
        {
          id: 'post-1',
          userId: 'user-456',
          imageUrl: 'https://example.com/explore1.jpg',
          caption: 'Explore post',
          likesCount: 100,
          commentsCount: 20,
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ];

      vi.mocked(mockFeedService.getExploreFeed).mockResolvedValue({
        posts: mockPosts,
        hasMore: false,
      });

      const result = await adapter.getExploreFeed({ first: 20 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.edges).toHaveLength(1);
        expect(result.data.edges[0].node.caption).toBe('Explore post');
      }
    });

    it('should support optional viewerId for personalization', async () => {
      vi.mocked(mockFeedService.getExploreFeed).mockResolvedValue({
        posts: [],
        hasMore: false,
      });

      await adapter.getExploreFeed({ first: 20 }, UserId('viewer-123'));

      expect(mockFeedService.getExploreFeed).toHaveBeenCalledWith({
        limit: 20,
        cursor: undefined,
        viewerId: 'viewer-123',
      });
    });

    it('should handle anonymous users', async () => {
      vi.mocked(mockFeedService.getExploreFeed).mockResolvedValue({
        posts: [],
        hasMore: false,
      });

      await adapter.getExploreFeed({ first: 20 });

      expect(mockFeedService.getExploreFeed).toHaveBeenCalledWith({
        limit: 20,
        cursor: undefined,
        viewerId: undefined,
      });
    });

    it('should return error when service throws', async () => {
      const error = new Error('Explore error');
      vi.mocked(mockFeedService.getExploreFeed).mockRejectedValue(error);

      const result = await adapter.getExploreFeed({ first: 20 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(error);
      }
    });
  });

  describe('Type safety', () => {
    it('should implement IFeedRepository interface', () => {
      expect(adapter.getFollowingFeed).toBeDefined();
      expect(adapter.getExploreFeed).toBeDefined();
      expect(typeof adapter.getFollowingFeed).toBe('function');
      expect(typeof adapter.getExploreFeed).toBe('function');
    });
  });
});
