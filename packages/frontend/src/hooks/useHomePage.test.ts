import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { useHomePage } from './useHomePage';
import type { IFeedService } from '../services/interfaces/IFeedService';
import { createSuccessState, createErrorState } from '../graphql/types';
import type { FeedResult } from '../services/interfaces/IFeedService';
import type { PostWithAuthor } from '@social-media-app/shared';
import * as IntersectionObserverModule from './useIntersectionObserver';

/**
 * Test suite for useHomePage hook
 * 
 * Tests the composite hook that combines useFeed and useFeedInfiniteScroll:
 * - Hook composition
 * - Type inference
 * - Complete user flow (load, scroll, load more)
 * - Error states
 */
describe('useHomePage', () => {
  let mockFeedService: IFeedService;
  let mockGetFeed: Mock;
  let mockUseIntersectionObserver: Mock;

  const mockPost1: PostWithAuthor = {
    id: 'post-1',
    userId: 'user-1',
    userHandle: '@user1',
    userName: 'User One',
    userAvatarUrl: 'https://example.com/avatar1.jpg',
    caption: 'Test post 1',
    imageUrl: 'https://example.com/image1.jpg',
    likesCount: 10,
    commentsCount: 2,
    isLiked: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockPost2: PostWithAuthor = {
    id: 'post-2',
    userId: 'user-2',
    userHandle: '@user2',
    userName: 'User Two',
    userAvatarUrl: 'https://example.com/avatar2.jpg',
    caption: 'Test post 2',
    imageUrl: 'https://example.com/image2.jpg',
    likesCount: 20,
    commentsCount: 3,
    isLiked: true,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  };

  beforeEach(() => {
    mockGetFeed = vi.fn();
    mockFeedService = {
      getFollowingFeed: mockGetFeed,
      getExploreFeed: mockGetFeed,
      markPostsAsRead: vi.fn(),
    };
    mockUseIntersectionObserver = vi.fn();
    vi.spyOn(IntersectionObserverModule, 'useIntersectionObserver').mockImplementation(mockUseIntersectionObserver);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Hook composition', () => {
    it('should return all useFeed properties', async () => {
      const mockResult: FeedResult = {
        items: [mockPost1],
        hasNextPage: true,
        endCursor: 'cursor-1',
      };

      mockGetFeed.mockResolvedValueOnce(createSuccessState(mockResult));

      const { result } = renderHook(() => useHomePage(mockFeedService));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current).toHaveProperty('posts');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('loadingMore');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('hasMore');
      expect(result.current).toHaveProperty('cursor');
      expect(result.current).toHaveProperty('retry');
      expect(result.current).toHaveProperty('loadMore');
      expect(result.current).toHaveProperty('setPosts');
    });

    it('should include sentinelRef from useFeedInfiniteScroll', () => {
      mockGetFeed.mockResolvedValueOnce(
        createSuccessState<FeedResult>({
          items: [],
          hasNextPage: false,
          endCursor: null,
        })
      );

      const { result } = renderHook(() => useHomePage(mockFeedService));

      expect(result.current).toHaveProperty('sentinelRef');
      expect(result.current.sentinelRef).toHaveProperty('current');
    });
  });

  describe('Default feed type', () => {
    it('should use "following" feed by default', async () => {
      const mockResult: FeedResult = {
        items: [mockPost1],
        hasNextPage: false,
        endCursor: null,
      };

      mockGetFeed.mockResolvedValueOnce(createSuccessState(mockResult));

      renderHook(() => useHomePage(mockFeedService));

      await waitFor(() => {
        expect(mockFeedService.getFollowingFeed).toHaveBeenCalledWith({ limit: 24 });
      });
    });

    it('should allow explicit "following" feed type', async () => {
      const mockResult: FeedResult = {
        items: [mockPost1],
        hasNextPage: false,
        endCursor: null,
      };

      mockGetFeed.mockResolvedValueOnce(createSuccessState(mockResult));

      renderHook(() => useHomePage(mockFeedService, 'following'));

      await waitFor(() => {
        expect(mockFeedService.getFollowingFeed).toHaveBeenCalledWith({ limit: 24 });
      });
    });

    it('should allow "explore" feed type', async () => {
      const mockResult: FeedResult = {
        items: [mockPost1],
        hasNextPage: false,
        endCursor: null,
      };

      mockGetFeed.mockResolvedValueOnce(createSuccessState(mockResult));

      renderHook(() => useHomePage(mockFeedService, 'explore'));

      await waitFor(() => {
        expect(mockFeedService.getExploreFeed).toHaveBeenCalledWith({ limit: 24 });
      });
    });
  });

  describe('Infinite scroll integration', () => {
    it('should setup infinite scroll with correct parameters', async () => {
      const mockResult: FeedResult = {
        items: [mockPost1],
        hasNextPage: true,
        endCursor: 'cursor-1',
      };

      mockGetFeed.mockResolvedValueOnce(createSuccessState(mockResult));

      renderHook(() => useHomePage(mockFeedService));

      await waitFor(() => {
        expect(mockUseIntersectionObserver).toHaveBeenCalledWith(
          expect.objectContaining({ current: null }),
          { threshold: 0.1, delay: 0, rootMargin: '100px' },
          expect.any(Function)
        );
      });
    });

    it('should trigger loadMore when sentinel becomes visible', async () => {
      const initialResult: FeedResult = {
        items: [mockPost1],
        hasNextPage: true,
        endCursor: 'cursor-1',
      };

      const moreResult: FeedResult = {
        items: [mockPost2],
        hasNextPage: false,
        endCursor: null,
      };

      mockGetFeed
        .mockResolvedValueOnce(createSuccessState(initialResult))
        .mockResolvedValueOnce(createSuccessState(moreResult));

      renderHook(() => useHomePage(mockFeedService));

      await waitFor(() => {
        expect(mockGetFeed).toHaveBeenCalledTimes(1);
      });

      const callback = mockUseIntersectionObserver.mock.calls[mockUseIntersectionObserver.mock.calls.length - 1][2];
      callback();

      await waitFor(() => {
        expect(mockGetFeed).toHaveBeenCalledTimes(2);
      });
    });

    it('should not trigger loadMore when hasMore is false', async () => {
      const mockResult: FeedResult = {
        items: [mockPost1],
        hasNextPage: false,
        endCursor: null,
      };

      mockGetFeed.mockResolvedValueOnce(createSuccessState(mockResult));

      renderHook(() => useHomePage(mockFeedService));

      await waitFor(() => {
        expect(mockGetFeed).toHaveBeenCalledTimes(1);
      });

      const callback = mockUseIntersectionObserver.mock.calls[mockUseIntersectionObserver.mock.calls.length - 1][2];
      callback();

      await waitFor(() => {
        expect(mockGetFeed).toHaveBeenCalledTimes(1);
      });
    });

    it('should not trigger loadMore when already loading', async () => {
      const mockResult: FeedResult = {
        items: [mockPost1],
        hasNextPage: true,
        endCursor: 'cursor-1',
      };

      let resolveLoadMore: (value: any) => void;
      const loadMorePromise = new Promise((resolve) => {
        resolveLoadMore = resolve;
      });

      mockGetFeed
        .mockResolvedValueOnce(createSuccessState(mockResult))
        .mockReturnValueOnce(loadMorePromise);

      const { result } = renderHook(() => useHomePage(mockFeedService));

      await waitFor(() => {
        expect(result.current.posts).toEqual([mockPost1]);
      });

      result.current.loadMore();

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(true);
      });

      const callback = mockUseIntersectionObserver.mock.calls[mockUseIntersectionObserver.mock.calls.length - 1][2];
      callback();

      resolveLoadMore!(createSuccessState(mockResult));

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      expect(mockGetFeed).toHaveBeenCalledTimes(2);
    });
  });

  describe('Complete user flow', () => {
    it('should handle full user flow: load, scroll, load more, end', async () => {
      const page1: FeedResult = {
        items: [mockPost1],
        hasNextPage: true,
        endCursor: 'cursor-1',
      };

      const page2: FeedResult = {
        items: [mockPost2],
        hasNextPage: false,
        endCursor: null,
      };

      mockGetFeed
        .mockResolvedValueOnce(createSuccessState(page1))
        .mockResolvedValueOnce(createSuccessState(page2));

      const { result } = renderHook(() => useHomePage(mockFeedService));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.posts).toEqual([mockPost1]);
        expect(result.current.hasMore).toBe(true);
      });

      await result.current.loadMore();

      await waitFor(() => {
        expect(result.current.posts).toEqual([mockPost1, mockPost2]);
        expect(result.current.hasMore).toBe(false);
        expect(result.current.loadingMore).toBe(false);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle initial load error', async () => {
      mockGetFeed.mockResolvedValueOnce(
        createErrorState({ message: 'Network error' })
      );

      const { result } = renderHook(() => useHomePage(mockFeedService));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe('Network error');
        expect(result.current.posts).toEqual([]);
      });
    });

    it('should allow retry after error', async () => {
      mockGetFeed
        .mockResolvedValueOnce(createErrorState({ message: 'Network error' }))
        .mockResolvedValueOnce(
          createSuccessState<FeedResult>({
            items: [mockPost1],
            hasNextPage: false,
            endCursor: null,
          })
        );

      const { result } = renderHook(() => useHomePage(mockFeedService));

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });

      result.current.retry();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.posts).toEqual([mockPost1]);
        expect(result.current.error).toBe(null);
      });
    });

    it('should handle loadMore error gracefully', async () => {
      const initialResult: FeedResult = {
        items: [mockPost1],
        hasNextPage: true,
        endCursor: 'cursor-1',
      };

      mockGetFeed
        .mockResolvedValueOnce(createSuccessState(initialResult))
        .mockResolvedValueOnce(createErrorState({ message: 'Failed to load more' }));

      const { result } = renderHook(() => useHomePage(mockFeedService));

      await waitFor(() => {
        expect(result.current.posts).toEqual([mockPost1]);
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await result.current.loadMore();

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      expect(result.current.posts).toEqual([mockPost1]);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('State management', () => {
    it('should expose setPosts for external updates', async () => {
      const mockResult: FeedResult = {
        items: [mockPost1],
        hasNextPage: false,
        endCursor: null,
      };

      mockGetFeed.mockResolvedValueOnce(createSuccessState(mockResult));

      const { result } = renderHook(() => useHomePage(mockFeedService));

      await waitFor(() => {
        expect(result.current.posts).toEqual([mockPost1]);
      });

      result.current.setPosts([mockPost2]);

      await waitFor(() => {
        expect(result.current.posts).toEqual([mockPost2]);
      });
    });
  });
});
