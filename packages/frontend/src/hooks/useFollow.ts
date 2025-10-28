import { useState, useCallback, useEffect } from 'react';
import { followService } from '../services/followService';
import {
  calculateOptimisticFollowState,
  calculateOptimisticUnfollowState,
  createStateSnapshot,
  shouldAllowFollow,
  shouldAllowUnfollow,
  hasInitialFollowValues,
  createFollowErrorMessage,
  createUnfollowErrorMessage,
  createFetchStatusErrorMessage,
  type FollowState,
} from '../utils/index.js';

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
 * Hook for managing follow state and operations for a user
 * Implements optimistic updates with rollback on error
 */
export const useFollow = (
  userId: string,
  options: UseFollowOptions = {}
) => {
  const {
    initialIsFollowing = false,
    initialFollowersCount = 0,
    initialFollowingCount = 0,
    onFollowStatusChange
  } = options;

  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [followingCount, setFollowingCount] = useState(initialFollowingCount);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when initial values change (e.g., when user data loads)
  useEffect(() => {
    setIsFollowing(initialIsFollowing);
    setFollowersCount(initialFollowersCount);
    setFollowingCount(initialFollowingCount);
  }, [initialIsFollowing, initialFollowersCount, initialFollowingCount]);

  /**
   * Fetch current follow status from server
   */
  const fetchFollowStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await followService.getFollowStatus(userId);

      if (result.status === 'success') {
        setIsFollowing(result.data.isFollowing);
        setFollowersCount(result.data.followersCount);
        setFollowingCount(result.data.followingCount);
        setIsLoading(false);
      } else {
        throw new Error('Failed to fetch follow status');
      }
    } catch (err) {
      setError('Failed to fetch follow status');
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Auto-fetch follow status on mount when no initial values provided
   * This ensures FollowButton shows correct state even when parent doesn't provide initial data
   */
  useEffect(() => {
    if (!hasInitialFollowValues(options) && userId) {
      fetchFollowStatus();
    }
  }, []); // Empty deps - only run on mount

  /**
   * Follow a user with optimistic update
   */
  const followUser = useCallback(async () => {
    // Don't follow if already following
    if (!shouldAllowFollow(isFollowing)) {
      return;
    }

    // Create snapshot for rollback
    const snapshot = createStateSnapshot({
      isFollowing,
      followersCount,
      followingCount,
    });

    // Calculate and apply optimistic state
    const optimisticState = calculateOptimisticFollowState({
      isFollowing,
      followersCount,
      followingCount,
    });

    setIsFollowing(optimisticState.isFollowing);
    setFollowersCount(optimisticState.followersCount);
    setIsLoading(true);
    setError(null);

    try {
      const result = await followService.followUser(userId);

      if (result.status === 'success') {
        // Confirm follow status from server, but keep optimistic followersCount
        // (server returns 0 because stream processor updates count async)
        setIsFollowing(result.data.isFollowing);
        setIsLoading(false);
      } else {
        throw new Error('Failed to follow user');
      }

      // NOTE: We intentionally do NOT call onFollowStatusChange here.
      // This implements pure optimistic UI - the count increment persists
      // and will be corrected by stream processor on next page load.
      // This matches industry standard UX (Instagram, Twitter, etc.)
    } catch (err) {
      // Rollback on error
      setIsFollowing(snapshot.isFollowing);
      setFollowersCount(snapshot.followersCount);
      setError(createFollowErrorMessage());
      setIsLoading(false);
    }
  }, [userId, isFollowing, followersCount, followingCount, onFollowStatusChange]);

  /**
   * Unfollow a user with optimistic update
   */
  const unfollowUser = useCallback(async () => {
    // Don't unfollow if not following
    if (!shouldAllowUnfollow(isFollowing)) {
      return;
    }

    // Create snapshot for rollback
    const snapshot = createStateSnapshot({
      isFollowing,
      followersCount,
      followingCount,
    });

    // Calculate and apply optimistic state
    const optimisticState = calculateOptimisticUnfollowState({
      isFollowing,
      followersCount,
      followingCount,
    });

    setIsFollowing(optimisticState.isFollowing);
    setFollowersCount(optimisticState.followersCount);
    setIsLoading(true);
    setError(null);

    try {
      const result = await followService.unfollowUser(userId);

      if (result.status === 'success') {
        // Confirm follow status from server, but keep optimistic followersCount
        // (server returns 0 because stream processor updates count async)
        setIsFollowing(result.data.isFollowing);
        setIsLoading(false);
      } else {
        throw new Error('Failed to unfollow user');
      }

      // NOTE: We intentionally do NOT call onFollowStatusChange here.
      // This implements pure optimistic UI - the count decrement persists
      // and will be corrected by stream processor on next page load.
      // This matches industry standard UX (Instagram, Twitter, etc.)
    } catch (err) {
      // Rollback on error
      setIsFollowing(snapshot.isFollowing);
      setFollowersCount(snapshot.followersCount);
      setError(createUnfollowErrorMessage());
      setIsLoading(false);
    }
  }, [userId, isFollowing, followersCount, followingCount, onFollowStatusChange]);

  /**
   * Toggle follow status (convenience method)
   */
  const toggleFollow = useCallback(async () => {
    if (isFollowing) {
      await unfollowUser();
    } else {
      await followUser();
    }
  }, [isFollowing, followUser, unfollowUser]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

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
    fetchFollowStatus,
    clearError
  };
};
