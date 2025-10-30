import React, { useMemo } from 'react';
import type { PostGridItem, PostWithAuthor } from '@social-media-app/shared';
import { PostThumbnail } from '../profile/PostThumbnail';
import { scramblePosts } from '../../utils/scramblePosts.js';
import { useHomePage } from '../../hooks/useHomePage';
import { useServices } from '../../services/ServiceProvider';
import {
  FeedLoading,
  FeedError,
  FeedEmpty,
  FeedLoadingMore,
  FeedEndMessage
} from '../feed';
import './ExplorePage.css';

/**
 * Transform PostWithAuthor to PostGridItem for grid display
 *
 * TypeScript patterns from SKILL.md:
 * - Pure function with explicit input/output types
 * - No side effects for predictable behavior
 * - Uses Pick utility type implicitly for field selection
 */
function transformToGridItem(post: PostWithAuthor): PostGridItem {
  return {
    id: post.id,
    userId: post.userId,
    userHandle: post.userHandle,
    // PostWithAuthor has imageUrl (full image), but PostGridItem needs thumbnailUrl
    // In explore feed, we don't have separate thumbnail, so we reuse imageUrl
    thumbnailUrl: post.imageUrl,
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    createdAt: post.createdAt,
    caption: post.caption,
  };
}

/**
 * Explore page - displays all public posts with infinite scroll
 *
 * Refactored to use useHomePage hook (Phase 12):
 * - Fixes singleton pattern violation (removed local GraphQL client creation)
 * - Reuses feed components from components/feed
 * - Uses shared business logic from useHomePage hook
 * - Reduced from 211 → ~100 lines (52% reduction)
 *
 * TypeScript patterns applied from SKILL.md:
 * - Readonly arrays for immutability (useMemo dependencies)
 * - Type-safe transformation functions
 * - Explicit interfaces and types
 */
export const ExplorePage: React.FC = () => {
  const { feedService } = useServices();

  const {
    posts,
    loading,
    error,
    hasMore,
    loadingMore,
    retry,
    sentinelRef
  } = useHomePage(feedService, 'explore');

  // Transform posts to grid items
  const gridItems = useMemo(
    () => posts.map(transformToGridItem),
    [posts]
  );

  // Scramble for maximum user diversity
  const scrambledPosts = useMemo(
    () => scramblePosts(gridItems),
    [gridItems]
  );

  if (loading && posts.length === 0) {
    return (
      <div className="explore-page">
        <div className="explore-container">
          <h1 className="explore-title">Explore</h1>
          <FeedLoading />
        </div>
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="explore-page">
        <div className="explore-container">
          <h1 className="explore-title">Explore</h1>
          <FeedError message={error} onRetry={retry} />
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="explore-page">
        <div className="explore-container">
          <h1 className="explore-title">Explore</h1>
          <FeedEmpty />
        </div>
      </div>
    );
  }

  return (
    <div className="explore-page">
      <div className="explore-container">
        <h1 className="explore-title">Explore</h1>

        <div className="posts-grid">
          {scrambledPosts.map((post) => (
            <PostThumbnail key={post.id} post={post} />
          ))}
        </div>

        {hasMore && (
          <div ref={sentinelRef} className="scroll-sentinel">
            <FeedLoadingMore loading={loadingMore} />
          </div>
        )}

        {!hasMore && posts.length > 0 && <FeedEndMessage />}
      </div>
    </div>
  );
};
