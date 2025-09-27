import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { PublicProfile, PostGridItem } from '@social-media-app/shared';
import { ProfileHeader } from './ProfileHeader';
import { PostGrid } from './PostGrid';
import { LoadingSpinner, ErrorState } from '../common/LoadingStates';
import { ProfileLayout } from '../layout/AppLayout';
import { profileService } from '../../services/profileService';
import { postService } from '../../services/postService';

/**
 * Main profile page component
 */
export const ProfilePage: React.FC = () => {
  const { handle } = useParams<{ handle: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<PostGridItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [postsLoading, setPostsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();

  useEffect(() => {
    if (handle) {
      loadProfile(handle);
      loadPosts(handle);
    }
  }, [handle]);

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

  const loadPosts = async (userHandle: string, nextCursor?: string) => {
    try {
      setPostsLoading(true);
      const postsData = await postService.getUserPosts(userHandle, 24, nextCursor);

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
    if (handle && cursor && !postsLoading && hasMore) {
      loadPosts(handle, cursor);
    }
  };

  const handleRetry = () => {
    if (handle) {
      loadProfile(handle);
      loadPosts(handle);
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
      header={<ProfileHeader profile={profile} />}
    >
      <PostGrid
        posts={posts}
        loading={postsLoading}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
      />
    </ProfileLayout>
  );
};