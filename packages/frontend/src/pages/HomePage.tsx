import React from 'react';
import { useHomePage } from '../hooks/useHomePage';
import { useServices } from '../services/ServiceProvider';
import {
  FeedLoading,
  FeedError,
  FeedEmpty,
  FeedLoadingMore,
  FeedEndMessage,
  FeedList
} from '../components/feed';
import {
  DevReadStateDebugger,
  DevManualMarkButton
} from '../components/dev';
import { useAuthStore } from '../stores/authStore';
import './HomePage.css';

/**
 * Home page - displays posts from followed users with infinite scroll
 *
 * Refactored to use composite hook pattern (Phase 12):
 * - Business logic extracted to useHomePage hook
 * - Presentation components extracted to components/feed
 * - Reduced from 217 → ~90 lines (58% reduction)
 */
export const HomePage: React.FC = () => {
  const { feedService } = useServices();
  const user = useAuthStore((state) => state.user);

  const {
    posts,
    loading,
    error,
    hasMore,
    loadingMore,
    retry,
    sentinelRef
  } = useHomePage(feedService, 'following');

  if (loading && posts.length === 0) {
    return (
      <div className="home-page">
        <div className="home-page__container">
          <FeedLoading />
        </div>
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="home-page">
        <div className="home-page__container">
          <FeedError message={error} onRetry={retry} />
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="home-page">
        <div className="home-page__container">
          <FeedEmpty />
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-page__container">
        <FeedList posts={posts} compact={true} />

        {hasMore && (
          <div ref={sentinelRef} className="home-page__sentinel">
            <FeedLoadingMore loading={loadingMore} />
          </div>
        )}

        {!hasMore && posts.length > 0 && (
          <FeedEndMessage />
        )}
      </div>

      {import.meta.env.DEV && (
        <div className="home-page__dev-tools">
          <DevReadStateDebugger posts={posts} currentUserId={user?.id} />
          {posts.map((post) => (
            <DevManualMarkButton
              key={post.id}
              post={post}
              onMarkComplete={retry}
            />
          ))}
        </div>
      )}
    </div>
  );
};
