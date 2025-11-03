/**
 * PostDetailPage - Relay Implementation
 *
 * This is the Relay-powered version of PostDetailPage that displays
 * a single post with its comments.
 *
 * Benefits of Relay version:
 * - Automatic caching and normalization
 * - Type-safe generated types from schema
 * - Optimistic updates
 * - No manual state management for loading/error
 */

import React, { Suspense } from 'react';
import { useLazyLoadQuery, graphql } from 'react-relay';
import { useParams, useNavigate } from 'react-router-dom';
import type { PostDetailPageRelayQuery as PostDetailPageRelayQueryType } from './__generated__/PostDetailPageRelayQuery.graphql';
import { ContentLayout } from '../layout/AppLayout';
import { MaterialIcon } from '../common/MaterialIcon';
import { PostCard } from './PostCard';
import { useAuth } from '../../hooks/useAuth';
import './PostDetailPage.css';

/**
 * Main query for PostDetailPage
 *
 * Fetches a single post by ID with all its details including author and comments
 */
const PostDetailQuery = graphql`
  query PostDetailPageRelayQuery($postId: ID!) {
    post(id: $postId) {
      id
      ...PostCardRelay_post
    }
  }
`;

/**
 * PostDetailPage Inner Component
 *
 * This component handles the query execution and renders the post details.
 * Separated from the outer component to allow Suspense boundaries.
 */
function PostDetailPageInner() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!postId) {
    return (
      <ContentLayout>
        <div className="post-detail-error" data-testid="post-detail-error">
          <div className="error-content">
            <div className="error-message">Post ID is required</div>
            <button
              onClick={() => navigate(-1)}
              className="tama-btn tama-btn--automotive tama-btn--racing-red"
              aria-label="Go back"
            >
              Go Back
            </button>
          </div>
        </div>
      </ContentLayout>
    );
  }

  const data = useLazyLoadQuery<PostDetailPageRelayQueryType>(
    PostDetailQuery,
    { postId },
    {
      fetchPolicy: 'store-or-network', // Use cache if available
    }
  );

  if (!data.post) {
    return (
      <ContentLayout>
        <div className="post-detail-error" data-testid="post-detail-error">
          <div className="error-content">
            <div className="error-message">Post not found</div>
            <button
              onClick={() => navigate(-1)}
              className="tama-btn tama-btn--automotive tama-btn--racing-red"
              aria-label="Go back"
            >
              Go Back
            </button>
          </div>
        </div>
      </ContentLayout>
    );
  }

  const handleBackClick = () => {
    navigate(-1);
  };

  return (
    <ContentLayout>
      <div className="post-detail-page" data-testid="post-detail-page">
        <div className="post-detail-container" data-testid="post-detail-container">
          {/* Close Button */}
          <button
            onClick={handleBackClick}
            className="close-button"
            aria-label="Close"
          >
            <MaterialIcon name="close" variant="outlined" size="md" />
          </button>

          {/* Post Card with Comments - PostCard includes CommentList internally when variant="detail" */}
          <PostCard
            post={data.post}
            currentUserId={user?.id}
            variant="detail"
          />
        </div>
      </div>
    </ContentLayout>
  );
}

/**
 * PostDetailPage with Error Boundary
 *
 * Wraps the query component with error handling.
 * Relay will throw errors that can be caught here.
 */
class PostDetailPageErrorBoundary extends React.Component<
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
      const navigate = () => window.history.back();

      return (
        <ContentLayout>
          <div className="post-detail-error" data-testid="post-detail-error">
            <div className="error-content">
              <div className="error-message">
                {this.state.error?.message || 'Failed to load post'}
              </div>
              <button
                onClick={navigate}
                className="tama-btn tama-btn--automotive tama-btn--racing-red"
                aria-label="Go back"
              >
                Go Back
              </button>
            </div>
          </div>
        </ContentLayout>
      );
    }

    return this.props.children;
  }
}

/**
 * PostDetailPage with Suspense Boundary (Export)
 *
 * This is what should be imported and used in App.tsx
 */
export function PostDetailPageRelay(): JSX.Element {
  return (
    <PostDetailPageErrorBoundary>
      <Suspense
        fallback={
          <ContentLayout>
            <div className="post-detail-loading" data-testid="post-detail-loading">
              <div className="loading-container">
                <div className="loading-shimmer-container"></div>
              </div>
            </div>
          </ContentLayout>
        }
      >
        <PostDetailPageInner />
      </Suspense>
    </PostDetailPageErrorBoundary>
  );
}

// Export alias for backward compatibility
export { PostDetailPageRelay as PostDetailPage };
