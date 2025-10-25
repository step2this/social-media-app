import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { PostGridItem, PostWithAuthor } from '@social-media-app/shared';
import { FeedServiceGraphQL } from '../../services/implementations/FeedService.graphql.js';
import { PostThumbnail } from '../profile/PostThumbnail';
import { scramblePosts } from '../../utils/scramblePosts.js';
import { unwrap } from '../../graphql/types';
import './ExplorePage.css';
import { createGraphQLClient } from '../../graphql/client.js';

/**
 * Explore page - displays all public posts with infinite scroll
 * @returns React component for the explore page
 */

const feedService = new FeedServiceGraphQL(createGraphQLClient());

/**
 * Transform PostWithAuthor to PostGridItem for grid display
 */
function transformToGridItem(post: PostWithAuthor): PostGridItem {
  return {
    id: post.id,
    userId: post.userId,
    userHandle: post.userHandle,
    thumbnailUrl: post.imageUrl, // Use full image as thumbnail
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    createdAt: post.createdAt,
    caption: post.caption,
  };
}

export const ExplorePage: React.FC = () => {
  const [posts, setPosts] = useState<PostGridItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  // Ref for intersection observer
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Scramble posts for maximum user diversity
  const scrambledPosts = useMemo(() => scramblePosts(posts), [posts]);

  /**
   * Shared feed loading logic
   * @param isInitial - Whether this is initial load or loading more
   */
  const loadFeed = useCallback(async (isInitial: boolean) => {
    const currentCursor = isInitial ? undefined : cursor;

    try {
      if (isInitial) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const feedResult = unwrap(await feedService.getExploreFeed({ limit: 24, cursor: currentCursor }));
      const gridItems = feedResult.items.map(transformToGridItem);

      if (isInitial) {
        setPosts(gridItems);
      } else {
        setPosts(prev => [...prev, ...gridItems]);
      }

      setCursor(feedResult.endCursor ?? undefined);
      setHasMore(feedResult.hasNextPage);
    } catch (err) {
      console.error('Failed to load feed:', err);
      if (isInitial) {
        setError(err instanceof Error ? err.message : 'Failed to load feed. Please try again.');
      }
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [cursor]);

  /**
   * Load initial feed posts
   */
  const loadInitialPosts = useCallback(() => loadFeed(true), [loadFeed]);

  /**
   * Load more posts (for infinite scroll)
   */
  const loadMorePosts = useCallback(() => {
    if (!hasMore || loadingMore || !cursor) return;
    return loadFeed(false);
  }, [hasMore, loadingMore, cursor, loadFeed]);

  /**
   * Set up intersection observer for infinite scroll
   */
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMorePosts();
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadingMore, loadMorePosts]);

  /**
   * Load initial posts on mount
   */
  useEffect(() => {
    loadInitialPosts();
  }, [loadInitialPosts]);

  if (loading) {
    return (
      <div className="explore-page">
        <div className="explore-container">
          <h1 className="explore-title">Explore</h1>
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading posts...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="explore-page">
        <div className="explore-container">
          <h1 className="explore-title">Explore</h1>
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button onClick={loadInitialPosts} className="retry-button">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="explore-page">
        <div className="explore-container">
          <h1 className="explore-title">Explore</h1>
          <div className="empty-container">
            <p className="empty-message">No posts yet. Be the first to share!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="explore-page">
      <div className="explore-container">
        <h1 className="explore-title">Explore</h1>

        {/* Posts grid - scrambled for user diversity */}
        <div className="posts-grid">
          {scrambledPosts.map((post) => (
            <PostThumbnail key={post.id} post={post} />
          ))}
        </div>

        {/* Infinite scroll sentinel */}
        {hasMore && (
          <div ref={sentinelRef} className="scroll-sentinel">
            {loadingMore && (
              <div className="loading-more">
                <div className="spinner"></div>
                <p>Loading more...</p>
              </div>
            )}
          </div>
        )}

        {/* End of feed message */}
        {!hasMore && posts.length > 0 && (
          <div className="end-of-feed">
            <p>You've reached the end! 🎉</p>
          </div>
        )}
      </div>
    </div>
  );
};
