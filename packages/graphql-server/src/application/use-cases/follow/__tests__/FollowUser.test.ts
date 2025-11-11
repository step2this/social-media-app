/**
 * Behavioral Tests for FollowUser and UnfollowUser Use Cases
 *
 * Testing Principles:
 * ✅ No mocks - use real in-memory service implementations
 * ✅ DRY with helper functions
 * ✅ Behavioral testing - test follow/unfollow outcomes
 * ✅ Type-safe throughout
 * ✅ Test core use cases + key edge cases
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FollowUser } from '../FollowUser.js';
import { UnfollowUser } from '../UnfollowUser.js';
import { UserId } from '../../../../shared/types/index.js';
import { createFakeServices } from '../../../../__tests__/helpers/fake-services.js';

describe('Follow Use Cases', () => {
  let services: ReturnType<typeof createFakeServices>;
  let followUserUseCase: FollowUser;
  let unfollowUserUseCase: UnfollowUser;

  beforeEach(() => {
    services = createFakeServices();
    followUserUseCase = new FollowUser({ followService: services.followService });
    unfollowUserUseCase = new UnfollowUser({ followService: services.followService as any });
  });

  describe('FollowUser', () => {
    it('should follow a user successfully', async () => {
      const result = await followUserUseCase.execute({
        followerId: UserId('user-1'),
        followeeId: UserId('user-2'),
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isFollowing).toBe(true);
        expect(result.data.followersCount).toBe(1);
        expect(result.data.followingCount).toBe(1);
      }
    });

    it('should reject following yourself', async () => {
      const result = await followUserUseCase.execute({
        followerId: UserId('user-1'),
        followeeId: UserId('user-1'),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('cannot follow yourself');
      }
    });

    it('should be idempotent - following twice succeeds', async () => {
      await followUserUseCase.execute({
        followerId: UserId('user-1'),
        followeeId: UserId('user-2'),
      });

      const result = await followUserUseCase.execute({
        followerId: UserId('user-1'),
        followeeId: UserId('user-2'),
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.followersCount).toBe(1); // Not 2
      }
    });

    it('should track follower and following counts separately', async () => {
      // User 1 follows User 2 and User 3
      await followUserUseCase.execute({
        followerId: UserId('user-1'),
        followeeId: UserId('user-2'),
      });
      const result = await followUserUseCase.execute({
        followerId: UserId('user-1'),
        followeeId: UserId('user-3'),
      });

      expect(result.success).toBe(true);
      if (result.success) {
        // User 1 is following 2 users
        expect(result.data.followingCount).toBe(2);
        // User 3 has 1 follower
        expect(result.data.followersCount).toBe(1);
      }
    });

    it('should handle multiple followers for same user', async () => {
      await followUserUseCase.execute({
        followerId: UserId('user-1'),
        followeeId: UserId('user-target'),
      });
      await followUserUseCase.execute({
        followerId: UserId('user-2'),
        followeeId: UserId('user-target'),
      });
      const result = await followUserUseCase.execute({
        followerId: UserId('user-3'),
        followeeId: UserId('user-target'),
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.followersCount).toBe(3);
      }
    });
  });

  describe('UnfollowUser', () => {
    it('should unfollow a previously followed user', async () => {
      await followUserUseCase.execute({
        followerId: UserId('user-1'),
        followeeId: UserId('user-2'),
      });

      const result = await unfollowUserUseCase.execute({
        followerId: UserId('user-1'),
        followeeId: UserId('user-2'),
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isFollowing).toBe(false);
        expect(result.data.followersCount).toBe(0);
        expect(result.data.followingCount).toBe(0);
      }
    });

    it('should be idempotent - unfollowing when not following succeeds', async () => {
      const result = await unfollowUserUseCase.execute({
        followerId: UserId('user-1'),
        followeeId: UserId('user-2'),
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isFollowing).toBe(false);
      }
    });

    it('should not affect other followers when one unfollows', async () => {
      await followUserUseCase.execute({ followerId: UserId('user-1'), followeeId: UserId('user-target') });
      await followUserUseCase.execute({ followerId: UserId('user-2'), followeeId: UserId('user-target') });
      await unfollowUserUseCase.execute({ followerId: UserId('user-1'), followeeId: UserId('user-target') });

      const result = await followUserUseCase.execute({
        followerId: UserId('user-2'),
        followeeId: UserId('user-target'),
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.followersCount).toBe(1);
      }
    });
  });

  describe('Follow/Unfollow Integration', () => {
    it('should support follow → unfollow → follow workflow', async () => {
      const follow1 = await followUserUseCase.execute({
        followerId: UserId('user-1'),
        followeeId: UserId('user-2'),
      });
      const unfollow = await unfollowUserUseCase.execute({
        followerId: UserId('user-1'),
        followeeId: UserId('user-2'),
      });
      const follow2 = await followUserUseCase.execute({
        followerId: UserId('user-1'),
        followeeId: UserId('user-2'),
      });

      expect(follow1.success && unfollow.success && follow2.success).toBe(true);
      if (follow1.success && unfollow.success && follow2.success) {
        expect(follow1.data.isFollowing).toBe(true);
        expect(unfollow.data.isFollowing).toBe(false);
        expect(follow2.data.isFollowing).toBe(true);
      }
    });
  });
});
