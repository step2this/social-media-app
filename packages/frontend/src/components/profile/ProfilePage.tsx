/**
 * ProfilePage - Relay Implementation
 * 
 * This is the Relay-powered version of ProfilePage that displays
 * a user's profile with their posts.
 * 
 * Benefits of Relay version:
 * - Automatic caching and normalization
 * - Built-in pagination for user posts
 * - Type-safe generated types from schema
 * - No manual state management for loading/error
 * - Optimistic updates for follow mutations
 */

import React, { Suspense } from 'react';
import { useLazyLoadQuery, graphql } from 'react-relay';
import { useParams, useNavigate } from 'react-router-dom';
import type { ProfilePageRelayQuery as ProfilePageRelayQueryType } from './__generated__/ProfilePageRelayQuery.graphql';

// Import presentation components
import { ProfileDisplay } from './ProfileDisplay';
import { FollowButton } from '../common/FollowButton';
import { PostGrid } from './PostGrid';
import { LoadingSpinner, ErrorState } from '../common/LoadingStates';
import { ProfileLayout } from '../layout/AppLayout';
import { useAuth } from '../../hooks/useAuth';

import './ProfilePage.css';

/**
 * Main query for ProfilePage
 * 
 * Fetches user profile by handle with their posts
 */
const ProfilePageQuery = graphql`
  query ProfilePageRelayQuery($handle: String!, $first: Int!, $after: String) {
    profile(handle: $handle) {
      id
      handle
      username
      fullName
      profilePictureUrl
      bio
      followersCount
      followingCount
      postsCount
      isFollowing
    }
    userPosts(handle: $handle, limit: $first, cursor: $after) {
      edges {
        cursor
        node {
          id
          imageUrl
          thumbnailUrl
          likesCount
          commentsCount
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
 * Transform Relay user to PublicProfile
 */
function transformRelayUser(user: any) {
  return {
    id: user.id,
    handle: user.handle,
    username: user.username,
    fullName: user.fullName || user.username,
    profilePictureUrl: user.profilePictureUrl,
    bio: user.bio,
    followersCount: user.followersCount,
    followingCount: user.followingCount,
    postsCount: user.postsCount,
    isFollowing: user.isFollowing,
    createdAt: new Date().toISOString(), // Fallback since not in query
  };
}

/**
 * Transform Relay posts to PostGridItem array
 */
function transformRelayPosts(edges: any[], userHandle: string, userId: string) {
  return edges.map((edge: any) => ({
    id: edge.node.id,
    userId: userId,
    userHandle: userHandle,
    thumbnailUrl: edge.node.thumbnailUrl,
    likesCount: edge.node.likesCount,
    commentsCount: edge.node.commentsCount,
    createdAt: new Date().toISOString(), // Fallback since not in query
  }));
}

/**
 * ProfilePage Posts Component (With Pagination)
 */
function ProfilePagePosts({ 
  handle, 
  userId, 
  initialPosts 
}: { 
  handle: string; 
  userId: string; 
  initialPosts: any;
}) {
  const [postsLoading] = React.useState(false);
  const allPosts = initialPosts;

  // Transform posts
  const posts = transformRelayPosts(allPosts.edges, handle, userId);
  const hasMore = allPosts.pageInfo.hasNextPage;
  const nextCursor = allPosts.pageInfo.endCursor;

  // Handle load more (would use refetch in full implementation)
  const handleLoadMore = () => {
    console.log('TODO: Implement load more for profile posts', handle, nextCursor);
    // In full implementation, would refetch with new cursor
  };

  return (
    <PostGrid
      posts={posts}
      loading={postsLoading}
      hasMore={hasMore}
      onLoadMore={handleLoadMore}
    />
  );
}

/**
 * ProfilePage Inner Component
 * 
 * Handles the query execution and renders the profile.
 */
function ProfilePageInner() {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!handle) {
    return (
      <ProfileLayout
        header={
          <div className="profile-header">
            <h1 className="profile-title tama-heading">🐾 Pet Profile</h1>
            <p className="profile-subtitle">View pet adventures and activities</p>
          </div>
        }
      >
        <div className="profile-error">
          <p>Handle is required</p>
          <button onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </ProfileLayout>
    );
  }

  const data = useLazyLoadQuery<ProfilePageRelayQueryType>(
    ProfilePageQuery,
    { handle, first: 24 },
    {
      fetchPolicy: 'store-or-network', // Use cache if available
    }
  );

  if (!data.profile) {
    return (
      <ProfileLayout
        header={
          <div className="profile-header">
            <h1 className="profile-title tama-heading">🐾 Pet Profile</h1>
            <p className="profile-subtitle">View pet adventures and activities</p>
          </div>
        }
      >
        <ErrorState
          message="Profile not found"
          onRetry={() => window.location.reload()}
        />
      </ProfileLayout>
    );
  }

  // Transform data
  const profile = transformRelayUser(data.profile);

  // Check if viewing own profile
  const isOwnProfile = user && user.id === profile.id;

  /**
   * Refresh profile data after follow/unfollow
   * NOTE: This callback is currently NOT used by FollowButton.
   * We use pure optimistic UI instead - follow/unfollow counts update immediately
   * and persist until next page load, when stream processor updates are fetched.
   */
  const handleFollowStatusChange = async () => {
    // Could trigger a refetch here if needed
    console.log('Follow status changed');
  };

  return (
    <ProfileLayout
      header={
        <div className="profile-header">
          <h1 className="profile-title tama-heading">🐾 Pet Profile</h1>
          <p className="profile-subtitle">View pet adventures and activities</p>
        </div>
      }
    >
      <div className="tama-card">
        <ProfileDisplay profile={profile} />

        {/* Follow Button for other users' profiles */}
        {!isOwnProfile && profile.id && (
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <FollowButton
              userId={profile.id}
              initialIsFollowing={profile.isFollowing}
              initialFollowersCount={profile.followersCount}
              onFollowStatusChange={handleFollowStatusChange}
            />
          </div>
        )}
      </div>

      <ProfilePagePosts handle={handle} userId={profile.id} initialPosts={data.userPosts} />
    </ProfileLayout>
  );
}

/**
 * ProfilePage with Error Boundary
 * 
 * Wraps the query component with error handling.
 * Relay will throw errors that can be caught here.
 */
class ProfilePageErrorBoundary extends React.Component<
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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ProfilePage error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ProfileLayout
          header={
            <div className="profile-header">
              <h1 className="profile-title tama-heading">🐾 Pet Profile</h1>
              <p className="profile-subtitle">View pet adventures and activities</p>
            </div>
          }
        >
          <ErrorState
            message={this.state.error?.message || 'Failed to load profile'}
            onRetry={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          />
        </ProfileLayout>
      );
    }

    return this.props.children;
  }
}

/**
 * ProfilePage with Suspense Boundary (Export)
 * 
 * This is what should be imported and used in App.tsx
 */
export function ProfilePageRelay(): JSX.Element {
  return (
    <ProfilePageErrorBoundary>
      <Suspense fallback={<LoadingSpinner message="Loading profile..." />}>
        <ProfilePageInner />
      </Suspense>
    </ProfilePageErrorBoundary>
  );
}
