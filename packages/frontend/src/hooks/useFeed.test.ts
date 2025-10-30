import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { useFeed } from './useFeed';
import type { IFeedService } from '../services/interfaces/IFeedService';
import { createSuccessState, createErrorState } from '../graphql/types';
import type { FeedResult } from '../services/interfaces/IFeedService';
import type { PostWithAuthor } from '@social-media-app/shared';

/**
 * Test suite for useFeed hook
 * 
 * Tests the core feed fetching logic including:
 * - Initial state
 * - Loading posts on mount
 * - Error handling with retry
 * - Pagination (loadMore, hasMore, cursor)
 * - State setter exposure
 */
describe('useFeed', () => {
  let mockFeedService: IFeedService;
  let mockGetFeed: Mock;

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

  const mockPost3: PostWithAuthor = {
    id: 'post-3',
    userId: 'user-3',
    userHandle: '@user3',
    userName: 'User Three',
    userAvatarUrl: 'https://example.com/avatar3.jpg',
    caption: 'Test post 3',
    imageUrl: 'https://example.com/image3.jpg',
    likesCount: 30,
    commentsCount: 4,
    isLiked: false,
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  };

  beforeEach(() => {
    mockGetFeed = vi.fn();
    mockFeedService = {
      getFollowingFeed: mockGetFeed,
      getExploreFeed: mockGetFeed,
      markPostsAsRead: vi.fn(),
    };
  });

  describe('Initial state', () => {
    it('should initialize with correct default state', () => {
      mockGetFeed.mockResolvedValueOnce(
        createSuccessState<FeedResult>({
          items: [],
          hasNextPage: false,
          endCursor: null,
        })
      );

      const { result } = renderHook(() => useFeed(mockFeedService, 'following'));

      expect(result.current.posts).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.loadingMore).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.cursor).toBeUndefined();
    });
  });

  describe('Load posts on mount', () => {
    it('should load posts from following feed on mount', async () => {
      const mockResult: FeedResult = {
        items: [mockPost1, mockPost2],
        hasNextPage: true,
        endCursor: 'cursor-1',
      };

      mockGetFeed.mockResolvedValueOnce(createSuccessState(mockResult));

      const { result } = renderHook(() => useFeed(mockFeedService, 'following'));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.posts).toEqual([mockPost1, mockPost2]);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.cursor).toBe('cursor-1');
      expect(result.current.error).toBe(null);
      expect(mockGetFeed).toHaveBeenCalledWith({ limit: 24 });
    });

    it('should load posts from explore feed when feedType is "explore"', async () => {
      const mockResult: FeedResult = {
        items: [mockPost1],
        hasNextPage: false,
        endCursor: null,
      };

      mockGetFeed.mockResolvedValueOnce(createSuccessState(mockResult));

      const { result } = renderHook(() => useFeed(mockFeedService, 'explore'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.posts).toEqual([mockPost1]);
      expect(mockGetFeed).toHaveBeenCalledWith({ limit: 24 });
    });

    it('should set hasMore to false when no more pages', async () => {
      const mockResult: FeedResult = {
        items: [mockPost1],
        hasNextPage: false,
        endCursor: null,
      };

      mockGetFeed.mockResolvedValueOnce(createSuccessState(mockResult));

      const { result } = renderHook(() => useFeed(mockFeedService, 'following'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasMore).toBe(false);
      expect(result.current.cursor).toBeUndefined();
    });

    it('should handle empty feed result', async () => {
      const mockResult: FeedResult = {
        items: [],
        hasNextPage: false,
        endCursor: null,
      };

      mockGetFeed.mockResolvedValueOnce(createSuccessState(mockResult));

      const { result } = renderHook(() => useFeed(mockFeedService, 'following'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.posts).toEqual([]);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('Error handling', () => {
    it('should handle error state on initial load', async () => {
      mockGetFeed.mockResolvedValueOnce(
        createErrorState({ message: 'Network error' })
      );

      const { result } = renderHook(() => useFeed(mockFeedService, 'following'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.posts).toEqual([]);
    });

    it('should handle error with custom message', async () => {
      mockGetFeed.mockResolvedValueOnce(
        createErrorState({ message: 'Failed to fetch feed' })
      );

      const { result } = renderHook(() => useFeed(mockFeedService, 'following'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch feed');
    });

    it('should handle unexpected result status', async () => {
      mockGetFeed.mockResolvedValueOnce({ status: 'pending' } as any);

      const { result } = renderHook(() => useFeed(mockFeedService, 'following'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load your feed. Please try again.');
    });

    it('should retry loading feed on retry()', async () => {
      mockGetFeed
        .mockResolvedValueOnce(createErrorState({ message: 'Network error' }))
        .mockResolvedValueOnce(
          createSuccessState<FeedResult>({
            items: [mockPost1],
            hasNextPage: false,
            endCursor: null,
          })
        );

      const { result } = renderHook(() => useFeed(mockFeedService, 'following'));

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });

      result.current.retry();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.posts).toEqual([mockPost1]);
      expect(result.current.error).toBe(null);
      expect(mockGetFeed).toHaveBeenCalledTimes(2);
    });
  });

  describe('Pagination', () => {
    it('should load more posts when loadMore is called', async () => {
      const initialResult: FeedResult = {
        items: [mockPost1],
        hasNextPage: true,
        endCursor: 'cursor-1',
      };

      const moreResult: FeedResult = {
        items: [mockPost2],
        hasNextPage: true,
        endCursor: 'cursor-2',
      };

      mockGetFeed
        .mockResolvedValueOnce(createSuccessState(initialResult))
        .mockResolvedValueOnce(createSuccessState(moreResult));

      const { result } = renderHook(() => useFeed(mockFeedService, 'following'));

      await waitFor(() => {
        expect(result.current.posts).toEqual([mockPost1]);
      });

      await result.current.loadMore();

      await waitFor(() => {
        expect(result.current.posts).toEqual([mockPost1, mockPost2]);
      });

      expect(result.current.cursor).toBe('cursor-2');
      expect(result.current.hasMore).toBe(true);
      expect(mockGetFeed).toHaveBeenCalledTimes(2);
      expect(mockGetFeed).toHaveBeenNthCalledWith(2, { limit: 24, cursor: 'cursor-1' });
    });

    it('should not load more if hasMore is false', async () => {
      const mockResult: FeedResult = {
        items: [mockPost1],
        hasNextPage: false,
        endCursor: null,
      };

      mockGetFeed.mockResolvedValueOnce(createSuccessState(mockResult));

      const { result } = renderHook(() => useFeed(mockFeedService, 'following'));

      await waitFor(() => {
        expect(result.current.hasMore).toBe(false);
      });

      await result.current.loadMore();

      expect(mockGetFeed).toHaveBeenCalledTimes(1);
    });

    it('should not load more if already loading more', async () => {
      const initialResult: FeedResult = {
        items: [mockPost1],
        hasNextPage: true,
        endCursor: 'cursor-1',
      };

      const moreResult: FeedResult = {
        items: [mockPost2],
        hasNextPage: true,
        endCursor: 'cursor-2',
      };

      let resolveLoadMore: (value: any) => void;
      const loadMorePromise = new Promise((resolve) => {
        resolveLoadMore = resolve;
      });

      mockGetFeed
        .mockResolvedValueOnce(createSuccessState(initialResult))
        .mockReturnValueOnce(loadMorePromise);

      const { result } = renderHook(() => useFeed(mockFeedService, 'following'));

      await waitFor(() => {
        expect(result.current.posts).toEqual([mockPost1]);
      });

      result.current.loadMore();
      
      await waitFor(() => {
        expect(result.current.loadingMore).toBe(true);
      });

      result.current.loadMore();

      resolveLoadMore!(createSuccessState(moreResult));

      await waitFor(() => {
        expect(result.current.posts).toEqual([mockPost1, mockPost2]);
      });

      expect(mockGetFeed).toHaveBeenCalledTimes(2);
    });

    it('should not load more if cursor is undefined', async () => {
      const mockResult: FeedResult = {
        items: [mockPost1],
        hasNextPage: true,
        endCursor: null,
      };

      mockGetFeed.mockResolvedValueOnce(createSuccessState(mockResult));

      const { result } = renderHook(() => useFeed(mockFeedService, 'following'));

      await waitFor(() => {
        expect(result.current.hasMore).toBe(true);
      });

      await result.current.loadMore();

      expect(mockGetFeed).toHaveBeenCalledTimes(1);
    });

    it('should handle errors when loading more posts', async () => {
      const initialResult: FeedResult = {
        items: [mockPost1],
        hasNextPage: true,
        endCursor: 'cursor-1',
      };

      mockGetFeed
        .mockResolvedValueOnce(createSuccessState(initialResult))
        .mockResolvedValueOnce(createErrorState({ message: 'Failed to load more' }));

      const { result } = renderHook(() => useFeed(mockFeedService, 'following'));

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

    it('should set loadingMore to true while loading more posts', async () => {
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

      let resolveMore: (value: any) => void;
      const morePromise = new Promise((resolve) => {
        resolveMore = resolve;
      });

      mockGetFeed
        .mockResolvedValueOnce(createSuccessState(initialResult))
        .mockReturnValueOnce(morePromise);

      const { result } = renderHook(() => useFeed(mockFeedService, 'following'));

      await waitFor(() => {
        expect(result.current.posts).toEqual([mockPost1]);
      });

      result.current.loadMore();

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(true);
      });

      resolveMore!(createSuccessState(moreResult));

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      expect(result.current.posts).toEqual([mockPost1, mockPost2]);
    });
  });

  describe('State setter', () => {
    it('should expose setPosts for external updates', async () => {
      const mockResult: FeedResult = {
        items: [mockPost1],
        hasNextPage: false,
        endCursor: null,
      };

      mockGetFeed.mockResolvedValueOnce(createSuccessState(mockResult));

      const { result } = renderHook(() => useFeed(mockFeedService, 'following'));

      await waitFor(() => {
        expect(result.current.posts).toEqual([mockPost1]);
      });

      result.current.setPosts([mockPost2, mockPost3]);

      await waitFor(() => {
        expect(result.current.posts).toEqual([mockPost2, mockPost3]);
      });
    });

    it('should allow functional updates via setPosts', async () => {
      const mockResult: FeedResult = {
        items: [mockPost1],
        hasNextPage: false,
        endCursor: null,
      };

      mockGetFeed.mockResolvedValueOnce(createSuccessState(mockResult));

      const { result } = renderHook(() => useFeed(mockFeedService, 'following'));

      await waitFor(() => {
        expect(result.current.posts).toEqual([mockPost1]);
      });

      result.current.setPosts(prev => [...prev, mockPost2]);

      await waitFor(() => {
        expect(result.current.posts).toEqual([mockPost1, mockPost2]);
      });
    });
  });
});
