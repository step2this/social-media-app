import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { PublicProfile, PostGridItem } from '@social-media-app/shared';
import { ProfileHeader } from './ProfileHeader';
import { PostGrid } from './PostGrid';
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading profile...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg text-red-500">{error || 'Profile not found'}</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <ProfileHeader profile={profile} />
      <div className="mt-8 border-t pt-8">
        <PostGrid
          posts={posts}
          loading={postsLoading}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
        />
      </div>
    </div>
  );
};