import { useMutation, graphql } from 'react-relay';
import { useState, useCallback } from 'react';
import type { useFollowFollowUserMutation } from './__generated__/useFollowFollowUserMutation.graphql';
import type { useFollowUnfollowUserMutation } from './__generated__/useFollowUnfollowUserMutation.graphql';

/**
 * Hook for managing follow/unfollow mutations using Relay
 *
 * This hook provides mutation functions only - it does NOT track follow state locally.
 * State should be read from the parent query data (ProfilePage query) to avoid duplication.
 *
 * Uses Relay's cache updater functions to keep the UI in sync after mutations.
 * This ensures optimistic updates work correctly and data stays consistent.
 *
 * @param userId - The ID of the user to follow/unfollow
 * @returns Object containing mutation functions, loading state, and error state
 *
 * @example
 * ```tsx
 * // In ProfilePage, we already have isFollowing from the query:
 * const data = useLazyLoadQuery(ProfilePageQuery, { handle });
 * const { isFollowing, followersCount } = data.profile;
 *
 * // Hook provides mutations only:
 * const { followUser, unfollowUser, isLoading } = useFollow('user-123');
 *
 * // UI reads from query data, not from hook:
 * <FollowButton
 *   isFollowing={isFollowing}
 *   onClick={isFollowing ? unfollowUser : followUser}
 *   disabled={isLoading}
 * />
 * ```
 */
export function useFollow(userId: string) {
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

  /**
   * Follow a user
   *
   * Note: This doesn't return any value. The parent component should read
   * isFollowing state from its own query data, not from this hook.
   *
   * Relay will automatically update the cache with the mutation response,
   * causing the parent query to re-render with new data.
   */
  const followUser = useCallback(async () => {
    setError(null);

    commitFollow({
      variables: { userId },
      onError: (_err) => {
        setError('Failed to follow user');
      }
    });
  }, [userId, commitFollow]);

  /**
   * Unfollow a user
   *
   * Note: This doesn't return any value. The parent component should read
   * isFollowing state from its own query data, not from this hook.
   *
   * Relay will automatically update the cache with the mutation response,
   * causing the parent query to re-render with new data.
   */
  const unfollowUser = useCallback(async () => {
    setError(null);

    commitUnfollow({
      variables: { userId },
      onError: (_err) => {
        setError('Failed to unfollow user');
      }
    });
  }, [userId, commitUnfollow]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const isLoading = isFollowInFlight || isUnfollowInFlight;

  return {
    // Actions
    followUser,
    unfollowUser,
    clearError,

    // UI State
    isLoading,
    error
  };
}
