import { describe, it, expect } from 'vitest';
import {
  incrementFollowersCount,
  decrementFollowersCount,
  calculateOptimisticFollowState,
  calculateOptimisticUnfollowState,
  createStateSnapshot,
  shouldAllowFollow,
  shouldAllowUnfollow,
  hasInitialFollowValues,
  type FollowState,
} from './follow-state-helpers.js';

describe('follow-state-helpers', () => {
  describe('incrementFollowersCount', () => {
    it('should increment count by 1', () => {
      expect(incrementFollowersCount(0)).toBe(1);
      expect(incrementFollowersCount(99)).toBe(100);
      expect(incrementFollowersCount(1000)).toBe(1001);
    });

    it('should handle negative values gracefully', () => {
      expect(incrementFollowersCount(-1)).toBe(0);
    });
  });

  describe('decrementFollowersCount', () => {
    it('should decrement count by 1', () => {
      expect(decrementFollowersCount(1)).toBe(0);
      expect(decrementFollowersCount(100)).toBe(99);
      expect(decrementFollowersCount(1001)).toBe(1000);
    });

    it('should not go below 0', () => {
      expect(decrementFollowersCount(0)).toBe(0);
      expect(decrementFollowersCount(-1)).toBe(0);
    });
  });

  describe('calculateOptimisticFollowState', () => {
    it('should calculate optimistic state for follow action', () => {
      const currentState: FollowState = {
        isFollowing: false,
        followersCount: 99,
        followingCount: 50,
      };

      const optimisticState = calculateOptimisticFollowState(currentState);

      expect(optimisticState).toEqual({
        isFollowing: true,
        followersCount: 100,
        followingCount: 50,
      });
    });

    it('should not modify following count', () => {
      const currentState: FollowState = {
        isFollowing: false,
        followersCount: 0,
        followingCount: 123,
      };

      const optimisticState = calculateOptimisticFollowState(currentState);

      expect(optimisticState.followingCount).toBe(123);
    });

    it('should handle boundary values', () => {
      const currentState: FollowState = {
        isFollowing: false,
        followersCount: 0,
        followingCount: 0,
      };

      const optimisticState = calculateOptimisticFollowState(currentState);

      expect(optimisticState.followersCount).toBe(1);
    });
  });

  describe('calculateOptimisticUnfollowState', () => {
    it('should calculate optimistic state for unfollow action', () => {
      const currentState: FollowState = {
        isFollowing: true,
        followersCount: 100,
        followingCount: 50,
      };

      const optimisticState = calculateOptimisticUnfollowState(currentState);

      expect(optimisticState).toEqual({
        isFollowing: false,
        followersCount: 99,
        followingCount: 50,
      });
    });

    it('should not modify following count', () => {
      const currentState: FollowState = {
        isFollowing: true,
        followersCount: 100,
        followingCount: 456,
      };

      const optimisticState = calculateOptimisticUnfollowState(currentState);

      expect(optimisticState.followingCount).toBe(456);
    });

    it('should not decrement below 0', () => {
      const currentState: FollowState = {
        isFollowing: true,
        followersCount: 0,
        followingCount: 0,
      };

      const optimisticState = calculateOptimisticUnfollowState(currentState);

      expect(optimisticState.followersCount).toBe(0);
    });
  });

  describe('createStateSnapshot', () => {
    it('should create immutable snapshot of current state', () => {
      const currentState: FollowState = {
        isFollowing: true,
        followersCount: 100,
        followingCount: 50,
      };

      const snapshot = createStateSnapshot(currentState);

      expect(snapshot).toEqual({
        isFollowing: true,
        followersCount: 100,
        followingCount: 50,
      });

      // Verify it's a new object (immutable)
      expect(snapshot).not.toBe(currentState);
    });

    it('should preserve all state properties', () => {
      const currentState: FollowState = {
        isFollowing: false,
        followersCount: 0,
        followingCount: 0,
      };

      const snapshot = createStateSnapshot(currentState);

      expect(snapshot).toHaveProperty('isFollowing');
      expect(snapshot).toHaveProperty('followersCount');
      expect(snapshot).toHaveProperty('followingCount');
    });
  });

  describe('shouldAllowFollow', () => {
    it('should allow follow when not currently following', () => {
      expect(shouldAllowFollow(false)).toBe(true);
    });

    it('should not allow follow when already following', () => {
      expect(shouldAllowFollow(true)).toBe(false);
    });
  });

  describe('shouldAllowUnfollow', () => {
    it('should allow unfollow when currently following', () => {
      expect(shouldAllowUnfollow(true)).toBe(true);
    });

    it('should not allow unfollow when not following', () => {
      expect(shouldAllowUnfollow(false)).toBe(false);
    });
  });

  describe('hasInitialFollowValues', () => {
    it('should return true when initialIsFollowing is explicitly provided', () => {
      expect(hasInitialFollowValues({ initialIsFollowing: true })).toBe(true);
      expect(hasInitialFollowValues({ initialIsFollowing: false })).toBe(true);
    });

    it('should return false when initialIsFollowing is undefined', () => {
      expect(hasInitialFollowValues({})).toBe(false);
    });

    it('should distinguish between undefined and false', () => {
      expect(hasInitialFollowValues({ initialIsFollowing: undefined })).toBe(false);
      expect(hasInitialFollowValues({ initialIsFollowing: false })).toBe(true);
    });
  });

  describe('edge cases and immutability', () => {
    it('should not mutate original state in calculateOptimisticFollowState', () => {
      const originalState: FollowState = {
        isFollowing: false,
        followersCount: 99,
        followingCount: 50,
      };

      const originalStateCopy = { ...originalState };
      calculateOptimisticFollowState(originalState);

      expect(originalState).toEqual(originalStateCopy);
    });

    it('should not mutate original state in calculateOptimisticUnfollowState', () => {
      const originalState: FollowState = {
        isFollowing: true,
        followersCount: 100,
        followingCount: 50,
      };

      const originalStateCopy = { ...originalState };
      calculateOptimisticUnfollowState(originalState);

      expect(originalState).toEqual(originalStateCopy);
    });

    it('should handle extreme follower counts', () => {
      const largeCount = 999999999;
      expect(incrementFollowersCount(largeCount)).toBe(1000000000);
      expect(decrementFollowersCount(largeCount)).toBe(999999998);
    });
  });
});
