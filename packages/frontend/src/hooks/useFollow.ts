import { useState, useCallback, useEffect } from 'react';
import { followService } from '../services/followService.js';

/**
 * Options for initializing useFollow hook
 */
export interface UseFollowOptions {
  initialIsFollowing?: boolean;
  initialFollowersCount?: number;
  initialFollowingCount?: number;
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
    initialFollowingCount = 0
  } = options;

  // Track whether initial values were explicitly provided
  const hasInitialValues = 'initialIsFollowing' in options;

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
      const response = await followService.getFollowStatus(userId);
      setIsFollowing(response.isFollowing);
      setFollowersCount(response.followersCount);
      setFollowingCount(response.followingCount);
      setIsLoading(false);
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
    if (!hasInitialValues && userId) {
      fetchFollowStatus();
    }
  }, []); // Empty deps - only run on mount

  /**
   * Follow a user with optimistic update
   */
  const followUser = useCallback(async () => {
    // Don't follow if already following
    if (isFollowing) {
      return;
    }

    // Store original state for rollback
    const originalIsFollowing = isFollowing;
    const originalFollowersCount = followersCount;

    // Optimistic update
    setIsFollowing(true);
    setFollowersCount(prev => prev + 1);
    setIsLoading(true);
    setError(null);

    try {
      const response = await followService.followUser(userId);

      // Confirm follow status from server, but keep optimistic followersCount
      // (server returns 0 because stream processor updates count async)
      setIsFollowing(response.isFollowing);
      setIsLoading(false);
    } catch (err) {
      // Rollback on error
      setIsFollowing(originalIsFollowing);
      setFollowersCount(originalFollowersCount);
      setError('Failed to follow user');
      setIsLoading(false);
    }
  }, [userId, isFollowing, followersCount]);

  /**
   * Unfollow a user with optimistic update
   */
  const unfollowUser = useCallback(async () => {
    // Don't unfollow if not following
    if (!isFollowing) {
      return;
    }

    // Store original state for rollback
    const originalIsFollowing = isFollowing;
    const originalFollowersCount = followersCount;

    // Optimistic update
    setIsFollowing(false);
    setFollowersCount(prev => prev - 1);
    setIsLoading(true);
    setError(null);

    try {
      const response = await followService.unfollowUser(userId);

      // Confirm follow status from server, but keep optimistic followersCount
      // (server returns 0 because stream processor updates count async)
      setIsFollowing(response.isFollowing);
      setIsLoading(false);
    } catch (err) {
      // Rollback on error
      setIsFollowing(originalIsFollowing);
      setFollowersCount(originalFollowersCount);
      setError('Failed to unfollow user');
      setIsLoading(false);
    }
  }, [userId, isFollowing, followersCount]);

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
