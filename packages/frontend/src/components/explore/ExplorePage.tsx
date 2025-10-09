import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { PostGridItem } from '@social-media-app/shared';
import { feedService } from '../../services/feedService';
import { PostThumbnail } from '../profile/PostThumbnail';
import { scramblePosts } from '../../utils/scramblePosts.js';
import './ExplorePage.css';

/**
 * Explore page - displays all public posts with infinite scroll
 */
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
   * Load initial feed posts
   */
  const loadInitialPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await feedService.getFeedPosts(24);
      setPosts(response.posts);
      setCursor(response.nextCursor);
      setHasMore(response.hasMore);
    } catch (err) {
      console.error('Failed to load feed:', err);
      setError('Failed to load feed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load more posts (for infinite scroll)
   */
  const loadMorePosts = useCallback(async () => {
    if (!hasMore || loadingMore || !cursor) return;

    try {
      setLoadingMore(true);
      const response = await feedService.getFeedPosts(24, cursor);
      setPosts(prev => [...prev, ...response.posts]);
      setCursor(response.nextCursor);
      setHasMore(response.hasMore);
    } catch (err) {
      console.error('Failed to load more posts:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, hasMore, loadingMore]);

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
