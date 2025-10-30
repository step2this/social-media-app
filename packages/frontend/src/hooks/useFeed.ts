import { useState, useEffect, useCallback } from 'react';
import type { PostWithAuthor } from '@social-media-app/shared';
import type { IFeedService } from '../services/interfaces/IFeedService';
import { isSuccess } from '../graphql/types';

/**
 * Return type for useFeed hook
 * Exposes feed state and actions
 */
export interface UseFeedReturn {
  readonly posts: readonly PostWithAuthor[];
  readonly loading: boolean;
  readonly loadingMore: boolean;
  readonly error: string | null;
  readonly hasMore: boolean;
  readonly cursor: string | undefined;
  readonly retry: () => void;
  readonly loadMore: () => Promise<void>;
  readonly setPosts: React.Dispatch<React.SetStateAction<PostWithAuthor[]>>;
}

/**
 * Custom hook for managing feed data with pagination
 * 
 * Handles:
 * - Initial feed loading
 * - Pagination with cursor-based loading
 * - Error handling with retry capability
 * - Loading states (initial and loading more)
 * 
 * @param feedService - Feed service implementation
 * @param feedType - Type of feed to load ('following' | 'explore')
 * @returns Feed state and actions
 * 
 * @example
 * ```tsx
 * const { posts, loading, error, hasMore, loadMore, retry } = useFeed(feedService, 'following');
 * ```
 */
export const useFeed = (
  feedService: IFeedService,
  feedType: 'following' | 'explore'
): UseFeedReturn => {
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  /**
   * Load initial feed posts
   */
  const loadInitialPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const feedMethod = feedType === 'following' 
      ? feedService.getFollowingFeed.bind(feedService)
      : feedService.getExploreFeed.bind(feedService);

    const result = await feedMethod({ limit: 24 });

    if (isSuccess(result)) {
      setPosts(result.data.items);
      setCursor(result.data.endCursor ?? undefined);
      setHasMore(result.data.hasNextPage);
    } else if (result.status === 'error') {
      console.error(`Failed to load ${feedType} feed:`, result.error);
      setError(result.error.message || 'Failed to load your feed. Please try again.');
    } else {
      setError('Failed to load your feed. Please try again.');
    }

    setLoading(false);
  }, [feedService, feedType]);

  /**
   * Load more posts (for pagination)
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !cursor) return;

    setLoadingMore(true);

    const feedMethod = feedType === 'following' 
      ? feedService.getFollowingFeed.bind(feedService)
      : feedService.getExploreFeed.bind(feedService);

    const result = await feedMethod({ limit: 24, cursor });

    if (isSuccess(result)) {
      setPosts(prev => [...prev, ...result.data.items]);
      setCursor(result.data.endCursor ?? undefined);
      setHasMore(result.data.hasNextPage);
    } else if (result.status === 'error') {
      console.error('Failed to load more posts:', result.error);
    }

    setLoadingMore(false);
  }, [cursor, hasMore, loadingMore, feedService, feedType]);

  /**
   * Retry loading feed after error
   */
  const retry = useCallback(() => {
    loadInitialPosts();
  }, [loadInitialPosts]);

  /**
   * Load initial posts on mount
   */
  useEffect(() => {
    loadInitialPosts();
  }, [loadInitialPosts]);

  return {
    posts,
    loading,
    loadingMore,
    error,
    hasMore,
    cursor,
    retry,
    loadMore,
    setPosts,
  };
};
