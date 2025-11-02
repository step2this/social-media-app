/**
 * Follow State Helper Utilities
 * Pure functions for managing follow state calculations and transformations
 */

/**
 * Options for follow hook configuration
 */
export interface UseFollowOptions {
  initialIsFollowing?: boolean;
}

/**
 * Follow state representation
 */
export interface FollowState {
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
}

/**
 * Snapshot of follow state for rollback
 */
export interface FollowStateSnapshot {
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
}

/**
 * Increments followers count by 1
 * Ensures count never goes below 0
 *
 * @param count - Current followers count
 * @returns Incremented count (normalized to 0 if input was negative)
 */
export const incrementFollowersCount = (count: number): number => {
  // Normalize negative values to 0 before incrementing
  // This prevents corrupt data from propagating
  if (count < 0) {
    return 0;
  }
  return count + 1;
};

/**
 * Decrements followers count by 1
 * Ensures count never goes below 0
 *
 * @param count - Current followers count
 * @returns Decremented count (minimum 0)
 */
export const decrementFollowersCount = (count: number): number => Math.max(0, count - 1);

/**
 * Calculates optimistic state after follow action
 * Pure function - does not mutate input
 *
 * @param currentState - Current follow state
 * @returns New state with optimistic follow applied
 */
export const calculateOptimisticFollowState = (
  currentState: FollowState
): FollowState => ({
    isFollowing: true,
    followersCount: incrementFollowersCount(currentState.followersCount),
    followingCount: currentState.followingCount,
  });

/**
 * Calculates optimistic state after unfollow action
 * Pure function - does not mutate input
 *
 * @param currentState - Current follow state
 * @returns New state with optimistic unfollow applied
 */
export const calculateOptimisticUnfollowState = (
  currentState: FollowState
): FollowState => ({
    isFollowing: false,
    followersCount: decrementFollowersCount(currentState.followersCount),
    followingCount: currentState.followingCount,
  });

/**
 * Creates immutable snapshot of current state for rollback
 *
 * @param currentState - Current follow state
 * @returns Immutable copy of state
 */
export const createStateSnapshot = (
  currentState: FollowState
): FollowStateSnapshot => ({
    isFollowing: currentState.isFollowing,
    followersCount: currentState.followersCount,
    followingCount: currentState.followingCount,
  });

/**
 * Determines if follow action should be allowed
 * Follow is only allowed when not currently following
 *
 * @param isFollowing - Current following status
 * @returns True if follow action should proceed
 */
export const shouldAllowFollow = (isFollowing: boolean): boolean => !isFollowing;

/**
 * Determines if unfollow action should be allowed
 * Unfollow is only allowed when currently following
 *
 * @param isFollowing - Current following status
 * @returns True if unfollow action should proceed
 */
export const shouldAllowUnfollow = (isFollowing: boolean): boolean => isFollowing;

/**
 * Checks if initial follow values were explicitly provided
 * Used to determine if auto-fetch is needed on mount
 *
 * @param options - Hook options
 * @returns True if initialIsFollowing was explicitly provided
 */
export const hasInitialFollowValues = (
  options: UseFollowOptions
): boolean => options.initialIsFollowing !== undefined;
