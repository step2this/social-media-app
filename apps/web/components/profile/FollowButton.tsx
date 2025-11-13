'use client';

import { useState, useTransition } from 'react';
import { followUser, unfollowUser } from '@/app/actions/follows';

interface FollowButtonProps {
  userId: string;
  initialIsFollowing: boolean;
  initialFollowersCount: number;
}

export default function FollowButton({
  userId,
  initialIsFollowing,
  initialFollowersCount,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [isPending, startTransition] = useTransition();

  const handleFollowToggle = () => {
    // Optimistic update
    const newIsFollowing = !isFollowing;
    const newFollowersCount = newIsFollowing ? followersCount + 1 : followersCount - 1;

    setIsFollowing(newIsFollowing);
    setFollowersCount(newFollowersCount);

    // Server action
    startTransition(async () => {
      const result = newIsFollowing
        ? await followUser(userId)
        : await unfollowUser(userId);

      if (result.success) {
        // Update with server response
        setIsFollowing(result.isFollowing);
        setFollowersCount(result.followersCount);
      } else {
        // Revert on error
        setIsFollowing(!newIsFollowing);
        setFollowersCount(initialFollowersCount);
      }
    });
  };

  return (
    <button
      onClick={handleFollowToggle}
      disabled={isPending}
      style={{
        padding: '0.5rem 1.5rem',
        backgroundColor: isFollowing ? '#f5f5f5' : '#0095f6',
        color: isFollowing ? '#262626' : 'white',
        border: isFollowing ? '1px solid #dbdbdb' : 'none',
        borderRadius: '4px',
        fontWeight: 600,
        cursor: isPending ? 'wait' : 'pointer',
        opacity: isPending ? 0.7 : 1,
        transition: 'all 0.2s ease',
      }}
    >
      {isPending ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
    </button>
  );
}
