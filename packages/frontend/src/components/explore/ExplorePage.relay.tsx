/**
 * ExplorePage with Relay
 *
 * This is the Relay-powered version of ExplorePage that displays all public posts.
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

import React, { Suspense, useMemo, useRef } from 'react';
import { useLazyLoadQuery, usePaginationFragment, graphql } from 'react-relay';
import type { ExplorePageRelayQuery as ExplorePageRelayQueryType } from './__generated__/ExplorePageRelayQuery.graphql';
import type { ExplorePage_exploreFeed$key } from './__generated__/ExplorePage_exploreFeed.graphql';
import type { PostGridItem } from '@social-media-app/shared';
import { PostThumbnail } from '../profile/PostThumbnail';
import { scramblePosts } from '../../utils/scramblePosts';
import {
  FeedLoading,
  FeedError,
  FeedEmpty,
  FeedLoadingMore,
  FeedEndMessage,
} from '../feed';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import {
  transformRelayEdges,
  relayPostToPostGridItem,
} from '../../relay/relay-transformers';
import './ExplorePage.css';

/**
 * Main query for ExplorePage
 *
 * Fetches the initial set of posts from explore feed (all public posts).
 * The pagination fragment below handles loading more posts.
 */
const ExplorePageQuery = graphql`
  query ExplorePageRelayQuery($first: Int!, $after: String) {
    ...ExplorePage_exploreFeed @arguments(first: $first, after: $after)
  }
`;

/**
 * Pagination fragment for infinite scroll
 *
 * The @refetchable directive makes this fragment paginated.
 * The @connection directive tells Relay to append new edges to the existing list.
 */
const ExploreFeedPaginationFragment = graphql`
  fragment ExplorePage_exploreFeed on Query
  @refetchable(queryName: "ExplorePageExploreFeedPaginationQuery")
  @argumentDefinitions(
    after: { type: "String" }
    first: { type: "Int", defaultValue: 24 }
  ) {
    exploreFeed(after: $after, first: $first)
      @connection(key: "ExplorePage_exploreFeed") {
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
 * ExplorePage Feed Component (Inner)
 *
 * This component handles the pagination logic and renders the feed.
 * It's separated from the query component to allow Suspense boundaries.
 */
function ExplorePageFeed({ queryRef }: { queryRef: ExplorePage_exploreFeed$key }) {
  // usePaginationFragment handles loading more posts
  const {
    data,
    loadNext,
    hasNext,
    isLoadingNext,
  } = usePaginationFragment(
    ExploreFeedPaginationFragment,
    queryRef
  );

  // Transform Relay data to PostGridItem using generalized transformer
  const gridItems = useMemo(
    () => transformRelayEdges(data.exploreFeed.edges, relayPostToPostGridItem),
    [data.exploreFeed.edges]
  );

  // Scramble for maximum user diversity
  const scrambledPosts = useMemo(
    () => scramblePosts(gridItems),
    [gridItems]
  );

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

  if (scrambledPosts.length === 0) {
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

        {hasNext && (
          <div ref={sentinelRef} className="scroll-sentinel">
            <FeedLoadingMore loading={isLoadingNext} />
          </div>
        )}

        {!hasNext && scrambledPosts.length > 0 && <FeedEndMessage />}
      </div>
    </div>
  );
}

/**
 * ExplorePage Component (Outer)
 *
 * This component executes the query and provides error handling.
 * The Suspense boundary in the export handles loading states.
 */
function ExplorePageInner() {
  const data = useLazyLoadQuery<ExplorePageRelayQueryType>(
    ExplorePageQuery,
    { first: 24 },
    {
      fetchPolicy: 'store-or-network', // Use cache if available
    }
  );

  return <ExplorePageFeed queryRef={data} />;
}

/**
 * ExplorePage with Error Boundary
 *
 * Wraps the query component with error handling.
 * Relay will throw errors that can be caught here.
 */
class ExplorePageErrorBoundary extends React.Component<
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
        <div className="explore-page">
          <div className="explore-container">
            <h1 className="explore-title">Explore</h1>
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
 * ExplorePage with Suspense Boundary (Default Export)
 *
 * This is what should be imported and used in App.tsx.
 *
 * @example
 * ```tsx
 * // In App.tsx
 * import { ExplorePage } from './components/explore/ExplorePage.relay';
 * ```
 */
export function ExplorePage(): JSX.Element {
  return (
    <ExplorePageErrorBoundary>
      <Suspense
        fallback={
          <div className="explore-page">
            <div className="explore-container">
              <h1 className="explore-title">Explore</h1>
              <FeedLoading />
            </div>
          </div>
        }
      >
        <ExplorePageInner />
      </Suspense>
    </ExplorePageErrorBoundary>
  );
}
