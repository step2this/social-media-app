import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { FeedPostItem } from '@social-media-app/shared';
import { feedService } from '../services/feedService';
import { PostCard } from '../components/posts/PostCard';
import { useFeedItemAutoRead } from '../hooks/useFeedItemAutoRead';
import './HomePage.css';

/**
 * Wrapper component for PostCard with auto-read functionality
 * Handles Instagram-like behavior where posts are marked as read after viewing
 */
interface FeedItemWrapperProps {
  post: FeedPostItem;
}

const FeedItemWrapper: React.FC<FeedItemWrapperProps> = ({ post }) => {
  // Attach auto-read ref to enable Instagram-like read tracking
  // The hook handles the intersection observer and API call internally
  const elementRef = useFeedItemAutoRead(post.id);

  return (
    <div ref={elementRef} className="home-page__post-wrapper">
      <PostCard post={post} compact={true} />
    </div>
  );
};

/**
 * Home page - displays posts from followed users with infinite scroll
 */
export const HomePage: React.FC = () => {
  const [posts, setPosts] = useState<FeedPostItem[]>([]);
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
      <div className="home-page">
        <div className="home-page__container">
          <div className="home-page__loading">
            <div className="spinner"></div>
            <p>Loading your feed...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-page">
        <div className="home-page__container">
          <div className="home-page__error">
            <p className="home-page__error-message">{error}</p>
            <button onClick={loadInitialPosts} className="home-page__retry-btn">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="home-page">
        <div className="home-page__container">
          <div className="home-page__empty">
            <p className="home-page__empty-message">
              No posts yet! Follow some users to see their posts here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-page__container">
        {/* Vertical feed of posts */}
        <div className="home-page__feed">
          {posts.map((post) => (
            <FeedItemWrapper key={post.id} post={post} />
          ))}
        </div>

        {/* Infinite scroll sentinel */}
        {hasMore && (
          <div ref={sentinelRef} className="home-page__sentinel">
            {loadingMore && (
              <div className="home-page__loading-more">
                <div className="spinner"></div>
                <p>Loading more...</p>
              </div>
            )}
          </div>
        )}

        {/* End of feed message */}
        {!hasMore && posts.length > 0 && (
          <div className="home-page__end">
            <p>You're all caught up! 🎉</p>
          </div>
        )}
      </div>
    </div>
  );
};
