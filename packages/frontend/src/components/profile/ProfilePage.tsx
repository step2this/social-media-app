import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { PublicProfile, PostGridItem } from '@social-media-app/shared';
import { ProfileDisplay } from './ProfileDisplay';
import { FollowButton } from '../common/FollowButton';
import { PostGrid } from './PostGrid';
import { LoadingSpinner, ErrorState } from '../common/LoadingStates';
import { ProfileLayout } from '../layout/AppLayout';
import { profileService } from '../../services/profileService';
import { postService } from '../../services/postService';
import { useAuth } from '../../hooks/useAuth';

/**
 * Main profile page component
 */
export const ProfilePage: React.FC = () => {
  const { handle } = useParams<{ handle: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<PostGridItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [postsLoading, setPostsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();

  // Check if viewing own profile
  const isOwnProfile = user && profile && user.id === profile.id;

  useEffect(() => {
    if (handle) {
      loadProfile(handle);
    }
  }, [handle]);

  // Load posts when profile is loaded
  useEffect(() => {
    if (profile?.id) {
      loadPosts(profile.id);
    }
  }, [profile?.id]);

  const loadProfile = async (userHandle: string) => {
    try {
      setLoading(true);
      setError(null);
      const profileData = await profileService.getProfileByHandle(userHandle);
      setProfile(profileData);
    } catch (err) {
      setError('Failed to load profile');
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async (userId: string, nextCursor?: string) => {
    try {
      setPostsLoading(true);
      const postsData = await postService.getUserPostsByUserId(userId, 24, nextCursor);

      if (nextCursor) {
        setPosts(prev => [...prev, ...postsData.posts]);
      } else {
        setPosts(postsData.posts);
      }

      setHasMore(postsData.hasMore);
      setCursor(postsData.nextCursor);
    } catch (err) {
      console.error('Error loading posts:', err);
    } finally {
      setPostsLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (profile?.id && cursor && !postsLoading && hasMore) {
      loadPosts(profile.id, cursor);
    }
  };

  const handleRetry = () => {
    if (handle) {
      loadProfile(handle);
    }
    if (profile?.id) {
      loadPosts(profile.id);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading profile..." />;
  }

  if (error || !profile) {
    return (
      <ErrorState
        message={error || 'Profile not found'}
        onRetry={handleRetry}
      />
    );
  }

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
              initialIsFollowing={false}
              initialFollowersCount={profile.followersCount}
            />
          </div>
        )}
      </div>

      <PostGrid
        posts={posts}
        loading={postsLoading}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
      />
    </ProfileLayout>
  );
};