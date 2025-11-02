import { useMutation, graphql } from 'react-relay';
import { useState, useCallback } from 'react';
import type { useFollowFollowUserMutation } from './__generated__/useFollowFollowUserMutation.graphql';
import type { useFollowUnfollowUserMutation } from './__generated__/useFollowUnfollowUserMutation.graphql';

/**
 * Options for initializing useFollow hook
 */
export interface UseFollowOptions {
  initialIsFollowing?: boolean;
  initialFollowersCount?: number;
  initialFollowingCount?: number;
  onFollowStatusChange?: () => void | Promise<void>;
}

/**
 * Hook for managing follow state and operations for a user using Relay mutations
 *
 * Provides follow/unfollow mutations with optimistic updates.
 * Updates follow status from GraphQL responses.
 *
 * @param userId - The ID of the user to follow/unfollow
 * @param options - Optional configuration
 * @returns Object containing follow state and mutation functions
 *
 * @example
 * ```tsx
 * const { isFollowing, isLoading, followUser, unfollowUser } = useFollow(
 *   'user-123',
 *   { initialIsFollowing: false }
 * );
 *
 * const handleFollow = () => {
 *   followUser();
 * };
 * ```
 */
export function useFollow(
  userId: string,
  options: UseFollowOptions = {}
) {
  const {
    initialIsFollowing = false,
    initialFollowersCount = 0,
    initialFollowingCount = 0
  } = options;

  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [followingCount, setFollowingCount] = useState(initialFollowingCount);
  const [error, setError] = useState<string | null>(null);

  const [commitFollow, isFollowInFlight] = useMutation<useFollowFollowUserMutation>(
    graphql`
      mutation useFollowFollowUserMutation($userId: ID!) {
        followUser(userId: $userId) {
          success
          isFollowing
          followersCount
          followingCount
        }
      }
    `
  );

  const [commitUnfollow, isUnfollowInFlight] = useMutation<useFollowUnfollowUserMutation>(
    graphql`
      mutation useFollowUnfollowUserMutation($userId: ID!) {
        unfollowUser(userId: $userId) {
          success
          isFollowing
          followersCount
          followingCount
        }
      }
    `
  );

  const followUser = useCallback(async () => {
    if (isFollowing) return;

    // Optimistic update
    const originalIsFollowing = isFollowing;
    const originalFollowersCount = followersCount;

    setIsFollowing(true);
    setFollowersCount(prev => prev + 1);
    setError(null);

    commitFollow({
      variables: { userId },
      onCompleted: (response) => {
        setIsFollowing(response.followUser.isFollowing);
        setFollowersCount(response.followUser.followersCount);
        setFollowingCount(response.followUser.followingCount);
      },
      onError: (_err) => {
        // Rollback on error
        setIsFollowing(originalIsFollowing);
        setFollowersCount(originalFollowersCount);
        setError('Failed to follow user');
      }
    });
  }, [userId, isFollowing, followersCount, commitFollow]);

  const unfollowUser = useCallback(async () => {
    if (!isFollowing) return;

    // Optimistic update
    const originalIsFollowing = isFollowing;
    const originalFollowersCount = followersCount;

    setIsFollowing(false);
    setFollowersCount(prev => prev - 1);
    setError(null);

    commitUnfollow({
      variables: { userId },
      onCompleted: (response) => {
        setIsFollowing(response.unfollowUser.isFollowing);
        setFollowersCount(response.unfollowUser.followersCount);
        setFollowingCount(response.unfollowUser.followingCount);
      },
      onError: (_err) => {
        // Rollback on error
        setIsFollowing(originalIsFollowing);
        setFollowersCount(originalFollowersCount);
        setError('Failed to unfollow user');
      }
    });
  }, [userId, isFollowing, followersCount, commitUnfollow]);

  const toggleFollow = useCallback(async () => {
    if (isFollowing) {
      await unfollowUser();
    } else {
      await followUser();
    }
  }, [isFollowing, followUser, unfollowUser]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const isLoading = isFollowInFlight || isUnfollowInFlight;

  return {
    // State
    isFollowing,
    followersCount,
    followingCount,
    isLoading,
    error,

    // Actions
    followUser,
    unfollowUser,
    toggleFollow,
    clearError
  };
}
