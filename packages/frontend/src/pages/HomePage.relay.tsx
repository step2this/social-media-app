/**
 * HomePage with Relay
 *
 * This is the Relay-powered version of HomePage that displays posts from followed users.
 * Demonstrates Relay's benefits over handrolled GraphQL:
 *
 * Benefits:
 * - Automatic caching and normalization
 * - Built-in pagination with @connection directive
 * - Type-safe generated types from schema
 * - Optimistic updates
 * - No manual state management for loading/error
 *
 * Pattern from Phase 2 of Relay Migration Plan
 */

import React, { Suspense, useRef } from 'react';
import { useLazyLoadQuery, usePaginationFragment, graphql } from 'react-relay';
import type { HomePageRelayQuery as HomePageRelayQueryType } from './__generated__/HomePageRelayQuery.graphql';
import type { HomePage_followingFeed$key } from './__generated__/HomePage_followingFeed.graphql';
import {
  FeedLoading,
  FeedError,
  FeedEmpty,
  FeedLoadingMore,
  FeedEndMessage,
  FeedList,
} from '../components/feed';
import {
  DevReadStateDebugger,
  DevManualMarkButton,
} from '../components/dev';
import { useAuthStore } from '../stores/authStore';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import './HomePage.css';

/**
 * Main query for HomePage
 *
 * Fetches the initial set of posts from followed users.
 * The pagination fragment below handles loading more posts.
 */
const HomePageQuery = graphql`
  query HomePageRelayQuery($first: Int!, $after: String) {
    ...HomePage_followingFeed @arguments(first: $first, after: $after)
  }
`;

/**
 * Pagination fragment for infinite scroll
 *
 * The @refetchable directive makes this fragment paginated.
 * The @connection directive tells Relay to append new edges to the existing list.
 */
const FollowingFeedPaginationFragment = graphql`
  fragment HomePage_followingFeed on Query
  @refetchable(queryName: "HomePageFollowingFeedPaginationQuery")
  @argumentDefinitions(
    after: { type: "String" }
    first: { type: "Int", defaultValue: 24 }
  ) {
    followingFeed(after: $after, first: $first)
      @connection(key: "HomePage_followingFeed") {
      edges {
        node {
          id
          userId
          caption
          imageUrl
          thumbnailUrl
          likesCount
          commentsCount
          isLiked
          createdAt
          updatedAt
          author {
            id
            handle
            username
            fullName
            profilePictureUrl
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/**
 * HomePage Feed Component (Inner)
 *
 * This component handles the pagination logic and renders the feed.
 * It's separated from the query component to allow Suspense boundaries.
 */
function HomePageFeed({ queryRef }: { queryRef: HomePage_followingFeed$key }) {
  const user = useAuthStore((state) => state.user);

  // usePaginationFragment handles loading more posts
  const {
    data,
    loadNext,
    hasNext,
    isLoadingNext,
  } = usePaginationFragment(
    FollowingFeedPaginationFragment,
    queryRef
  );

  // Convert Relay data structure to match existing PostWithAuthor type
  const posts = data.followingFeed.edges.map((edge) => ({
    id: edge.node.id,
    userId: edge.node.userId,
    userHandle: edge.node.author.handle,
    authorHandle: edge.node.author.handle,
    authorId: edge.node.userId,
    caption: edge.node.caption,
    imageUrl: edge.node.imageUrl,
    thumbnailUrl: edge.node.thumbnailUrl,
    likesCount: edge.node.likesCount,
    commentsCount: edge.node.commentsCount,
    isLiked: edge.node.isLiked ?? false,
    createdAt: edge.node.createdAt,
    updatedAt: edge.node.updatedAt,
    author: {
      id: edge.node.author.id,
      handle: edge.node.author.handle,
      username: edge.node.author.username,
      fullName: edge.node.author.fullName,
      profilePictureUrl: edge.node.author.profilePictureUrl,
    },
  }));

  // Set up intersection observer for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);
  
  useIntersectionObserver(
    sentinelRef,
    {
      threshold: 0.1,
      delay: 0,
      rootMargin: '100px',
    },
    () => {
      if (hasNext && !isLoadingNext) {
        loadNext(24); // Load 24 more posts
      }
    }
  );

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

        {hasNext && (
          <div ref={sentinelRef} className="home-page__sentinel">
            <FeedLoadingMore loading={isLoadingNext} />
          </div>
        )}

        {!hasNext && posts.length > 0 && <FeedEndMessage />}
      </div>

      {import.meta.env.DEV && (
        <div className="home-page__dev-tools">
          <DevReadStateDebugger posts={posts} currentUserId={user?.id} />
          {posts.map((post) => (
            <DevManualMarkButton
              key={post.id}
              post={post}
              onMarkComplete={() => {
                // TODO: Implement refetch with Relay
                console.log('Mark complete not yet implemented with Relay');
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * HomePage Component (Outer)
 *
 * This component executes the query and provides error handling.
 * The Suspense boundary in the export handles loading states.
 */
function HomePageInner() {
  const data = useLazyLoadQuery<HomePageRelayQueryType>(
    HomePageQuery,
    { first: 24 },
    {
      fetchPolicy: 'store-or-network', // Use cache if available
    }
  );

  return <HomePageFeed queryRef={data} />;
}

/**
 * HomePage with Error Boundary
 *
 * Wraps the query component with error handling.
 * Relay will throw errors that can be caught here.
 */
class HomePageErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="home-page">
          <div className="home-page__container">
            <FeedError
              message={this.state.error?.message || 'An error occurred'}
              onRetry={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HomePage with Suspense Boundary (Default Export)
 *
 * This is what should be imported and used in App.tsx when the
 * RELAY_FEATURES.homeFeed flag is enabled.
 *
 * @example
 * ```tsx
 * // In App.tsx
 * import { HomePage } from './pages/HomePage.relay';
 * // or conditionally:
 * const HomePage = RELAY_FEATURES.homeFeed
 *   ? require('./pages/HomePage.relay').HomePage
 *   : require('./pages/HomePage').HomePage;
 * ```
 */
export function HomePage(): JSX.Element {
  return (
    <HomePageErrorBoundary>
      <Suspense
        fallback={
          <div className="home-page">
            <div className="home-page__container">
              <FeedLoading />
            </div>
          </div>
        }
      >
        <HomePageInner />
      </Suspense>
    </HomePageErrorBoundary>
  );
}
