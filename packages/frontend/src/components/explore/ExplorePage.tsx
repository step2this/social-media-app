import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { PostGridItem } from '@social-media-app/shared';
import { feedService } from '../../services/feedService';
import { PostThumbnail } from '../profile/PostThumbnail';
import './ExplorePage.css';

/**
 * Scramble posts to maximize user diversity
 * Ensures adjacent posts (horizontally and vertically) are from different users
 * Grid is 3 columns wide on desktop
 */
function scramblePosts(posts: PostGridItem[]): PostGridItem[] {
  if (posts.length === 0) return posts;

  // Group posts by userId
  const postsByUser = posts.reduce((acc, post) => {
    if (!acc[post.userId]) {
      acc[post.userId] = [];
    }
    acc[post.userId].push(post);
    return acc;
  }, {} as Record<string, PostGridItem[]>);

  const userIds = Object.keys(postsByUser);
  const scrambled: PostGridItem[] = [];
  const GRID_WIDTH = 3; // 3 columns

  // Round-robin through users to maximize diversity
  let userIndex = 0;
  let positionInRow = 0;
  const usedInPreviousRow: string[] = [];

  while (scrambled.length < posts.length) {
    let attempts = 0;
    let foundPost = false;

    // Try to find a user different from adjacent positions
    while (attempts < userIds.length && !foundPost) {
      const currentUserId = userIds[userIndex % userIds.length];
      const userPosts = postsByUser[currentUserId];

      if (userPosts && userPosts.length > 0) {
        // Check if this user is different from:
        // 1. Previous post in same row (left neighbor)
        // 2. Post directly above (same column, previous row)
        const leftNeighbor = scrambled[scrambled.length - 1];
        const aboveNeighbor = scrambled[scrambled.length - GRID_WIDTH];

        const isDifferentFromLeft = !leftNeighbor || leftNeighbor.userId !== currentUserId;
        const isDifferentFromAbove = !aboveNeighbor || aboveNeighbor.userId !== currentUserId;

        if (isDifferentFromLeft && isDifferentFromAbove) {
          scrambled.push(userPosts.shift()!);
          foundPost = true;

          // Track for next row
          if (positionInRow === GRID_WIDTH - 1) {
            usedInPreviousRow.push(currentUserId);
            if (usedInPreviousRow.length > GRID_WIDTH) {
              usedInPreviousRow.shift();
            }
          }
        }
      }

      userIndex++;
      attempts++;
    }

    // If we couldn't find a good match after trying all users, just take any available post
    if (!foundPost) {
      for (const userId of userIds) {
        if (postsByUser[userId] && postsByUser[userId].length > 0) {
          scrambled.push(postsByUser[userId].shift()!);
          break;
        }
      }
    }

    positionInRow = (positionInRow + 1) % GRID_WIDTH;
  }

  return scrambled;
}

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
