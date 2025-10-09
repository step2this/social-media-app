import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { PostGridItem } from '@social-media-app/shared';
import { feedService } from '../services/feedService';
import { PostThumbnail } from '../components/profile/PostThumbnail';
import '../components/explore/ExplorePage.css'; // Reuse explore page styles

/**
 * Home page - displays posts from followed users with infinite scroll
 */
export const HomePage: React.FC = () => {
  const [posts, setPosts] = useState<PostGridItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  // Ref for intersection observer
  const sentinelRef = useRef<HTMLDivElement>(null);

  /**
   * Load initial feed posts
   */
  const loadInitialPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await feedService.getFollowingFeed(24);
      setPosts(response.posts);
      setCursor(response.nextCursor);
      setHasMore(response.hasMore);
    } catch (err) {
      console.error('Failed to load following feed:', err);
      setError('Failed to load your feed. Please try again.');
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
      const response = await feedService.getFollowingFeed(24, cursor);
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
          <h1 className="explore-title">Your Feed</h1>
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
          <h1 className="explore-title">Your Feed</h1>
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
          <h1 className="explore-title">Your Feed</h1>
          <div className="empty-container">
            <p className="empty-message">
              No posts yet! Follow some users to see their posts here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="explore-page">
      <div className="explore-container">
        <h1 className="explore-title">Your Feed</h1>

        {/* Posts grid */}
        <div className="posts-grid">
          {posts.map((post) => (
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
            <p>You're all caught up! 🎉</p>
          </div>
        )}
      </div>
    </div>
  );
};
