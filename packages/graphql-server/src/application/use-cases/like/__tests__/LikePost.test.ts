/**
 * Behavioral Tests for LikePost and UnlikePost Use Cases
 *
 * Testing Principles:
 * ✅ No mocks - use real in-memory service implementations
 * ✅ DRY with helper functions
 * ✅ Behavioral testing - test like/unlike outcomes
 * ✅ Type-safe throughout
 * ✅ Test core use cases + key edge cases
 *
 * What we're testing:
 * - Liking posts (first time and idempotent)
 * - Unliking posts (when liked and idempotent)
 * - Like count tracking
 * - Multiple users liking same post
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LikePost } from '../LikePost.js';
import { UnlikePost } from '../UnlikePost.js';
import { UserId, PostId } from '../../../../shared/types/index.js';
import { createFakeServices } from '../../../../__tests__/helpers/fake-services.js';

describe('Like Use Cases', () => {
  let services: ReturnType<typeof createFakeServices>;
  let likePostUseCase: LikePost;
  let unlikePostUseCase: UnlikePost;

  beforeEach(() => {
    services = createFakeServices();
    likePostUseCase = new LikePost({
      likeService: services.likeService,
    });
    unlikePostUseCase = new UnlikePost({
      likeService: services.likeService as any,
    });
  });

  describe('LikePost', () => {
    it('should like a post successfully', async () => {
      // ACT
      const result = await likePostUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
      });

      // ASSERT
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isLiked).toBe(true);
        expect(result.data.success).toBe(true);
        expect(result.data.likesCount).toBe(1);
      }
    });

    it('should be idempotent - liking same post twice returns same result', async () => {
      // ARRANGE - First like
      await likePostUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
      });

      // ACT - Second like
      const result = await likePostUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
      });

      // ASSERT - Still liked, count doesn't increase
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isLiked).toBe(true);
        expect(result.data.likesCount).toBe(1); // Not 2
      }
    });

    it('should track likes count correctly with multiple users', async () => {
      // ACT - Three different users like the same post
      await likePostUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
      });
      await likePostUseCase.execute({
        userId: UserId('user-2'),
        postId: PostId('post-1'),
      });
      const result = await likePostUseCase.execute({
        userId: UserId('user-3'),
        postId: PostId('post-1'),
      });

      // ASSERT - Count is 3
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.likesCount).toBe(3);
      }
    });

    it('should track likes separately for different posts', async () => {
      // ACT - Same user likes different posts
      const result1 = await likePostUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
      });
      const result2 = await likePostUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-2'),
      });

      // ASSERT - Each post has 1 like
      expect(result1.success && result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.data.likesCount).toBe(1);
        expect(result2.data.likesCount).toBe(1);
      }
    });

    it('should return correct state after liking', async () => {
      // ACT
      const result = await likePostUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
      });

      // ASSERT - All state fields present
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty('isLiked');
        expect(result.data).toHaveProperty('success');
        expect(result.data).toHaveProperty('likesCount');
        expect(result.data.isLiked).toBe(true);
        expect(result.data.success).toBe(true);
        expect(typeof result.data.likesCount).toBe('number');
      }
    });

    it('should handle concurrent likes for same post', async () => {
      // ACT - Concurrent likes
      const results = await Promise.all([
        likePostUseCase.execute({ userId: UserId('user-1'), postId: PostId('post-1') }),
        likePostUseCase.execute({ userId: UserId('user-2'), postId: PostId('post-1') }),
        likePostUseCase.execute({ userId: UserId('user-3'), postId: PostId('post-1') }),
        likePostUseCase.execute({ userId: UserId('user-4'), postId: PostId('post-1') }),
      ]);

      // ASSERT - All succeeded
      expect(results.every((r) => r.success)).toBe(true);
      const lastResult = results[results.length - 1];
      if (lastResult.success) {
        expect(lastResult.data.likesCount).toBe(4);
      }
    });
  });

  describe('UnlikePost', () => {
    it('should unlike a previously liked post', async () => {
      // ARRANGE - Like first
      await likePostUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
      });

      // ACT - Unlike
      const result = await unlikePostUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
      });

      // ASSERT
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isLiked).toBe(false);
        expect(result.data.success).toBe(true);
        expect(result.data.likesCount).toBe(0);
      }
    });

    it('should be idempotent - unliking when not liked returns success', async () => {
      // ACT - Unlike without ever liking
      const result = await unlikePostUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
      });

      // ASSERT - No error, just not liked
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isLiked).toBe(false);
        expect(result.data.likesCount).toBe(0);
      }
    });

    it('should decrement like count correctly', async () => {
      // ARRANGE - Multiple users like
      await likePostUseCase.execute({ userId: UserId('user-1'), postId: PostId('post-1') });
      await likePostUseCase.execute({ userId: UserId('user-2'), postId: PostId('post-1') });
      await likePostUseCase.execute({ userId: UserId('user-3'), postId: PostId('post-1') });

      // ACT - One user unlikes
      const result = await unlikePostUseCase.execute({
        userId: UserId('user-2'),
        postId: PostId('post-1'),
      });

      // ASSERT - Count decremented from 3 to 2
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.likesCount).toBe(2);
      }
    });

    it('should not affect other users likes when one user unlikes', async () => {
      // ARRANGE
      await likePostUseCase.execute({ userId: UserId('user-1'), postId: PostId('post-1') });
      await likePostUseCase.execute({ userId: UserId('user-2'), postId: PostId('post-1') });

      // ACT - User 1 unlikes
      await unlikePostUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
      });

      // Re-like user 2 to check count
      const result = await likePostUseCase.execute({
        userId: UserId('user-2'),
        postId: PostId('post-1'),
      });

      // ASSERT - User 2 still liked, count is 1
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.likesCount).toBe(1);
        expect(result.data.isLiked).toBe(true);
      }
    });

    it('should handle multiple successive unlikes idempotently', async () => {
      // ARRANGE - Like first
      await likePostUseCase.execute({ userId: UserId('user-1'), postId: PostId('post-1') });

      // ACT - Unlike multiple times
      await unlikePostUseCase.execute({ userId: UserId('user-1'), postId: PostId('post-1') });
      await unlikePostUseCase.execute({ userId: UserId('user-1'), postId: PostId('post-1') });
      const result = await unlikePostUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
      });

      // ASSERT - Still success, count stays at 0
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isLiked).toBe(false);
        expect(result.data.likesCount).toBe(0);
      }
    });

    it('should not let count go below zero', async () => {
      // ACT - Unlike without any likes
      const result = await unlikePostUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
      });

      // ASSERT - Count is 0, not negative
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.likesCount).toBe(0);
        expect(result.data.likesCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Like/Unlike Integration', () => {
    it('should support like → unlike → like workflow', async () => {
      // ACT - Complete workflow
      const like1 = await likePostUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
      });
      const unlike = await unlikePostUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
      });
      const like2 = await likePostUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
      });

      // ASSERT - All transitions work
      expect(like1.success && unlike.success && like2.success).toBe(true);
      if (like1.success && unlike.success && like2.success) {
        expect(like1.data.isLiked).toBe(true);
        expect(unlike.data.isLiked).toBe(false);
        expect(like2.data.isLiked).toBe(true);
        expect(like2.data.likesCount).toBe(1);
      }
    });

    it('should handle rapid like/unlike toggling', async () => {
      // ACT - Rapid toggling
      await likePostUseCase.execute({ userId: UserId('user-1'), postId: PostId('post-1') });
      await unlikePostUseCase.execute({ userId: UserId('user-1'), postId: PostId('post-1') });
      await likePostUseCase.execute({ userId: UserId('user-1'), postId: PostId('post-1') });
      await unlikePostUseCase.execute({ userId: UserId('user-1'), postId: PostId('post-1') });
      const result = await likePostUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
      });

      // ASSERT - Final state is liked
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isLiked).toBe(true);
        expect(result.data.likesCount).toBe(1);
      }
    });

    it('should maintain correct count with mixed operations', async () => {
      // ARRANGE - Complex scenario
      await likePostUseCase.execute({ userId: UserId('user-1'), postId: PostId('post-1') });
      await likePostUseCase.execute({ userId: UserId('user-2'), postId: PostId('post-1') });
      await likePostUseCase.execute({ userId: UserId('user-3'), postId: PostId('post-1') });
      await unlikePostUseCase.execute({ userId: UserId('user-2'), postId: PostId('post-1') });
      await likePostUseCase.execute({ userId: UserId('user-4'), postId: PostId('post-1') });

      // ACT - Check final state
      const result = await likePostUseCase.execute({
        userId: UserId('user-5'),
        postId: PostId('post-1'),
      });

      // ASSERT - Count: 3 likes - 1 unlike + 1 like + 1 like = 4
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.likesCount).toBe(4);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors in LikePost', async () => {
      // ARRANGE - Break service
      const brokenService = {
        likePost: async () => {
          throw new Error('Database error');
        },
      };

      const brokenUseCase = new LikePost({ likeService: brokenService as any });

      // ACT
      const result = await brokenUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
      });

      // ASSERT
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    it('should handle service errors in UnlikePost', async () => {
      // ARRANGE - Break service
      const brokenService = {
        unlikePost: async () => {
          throw new Error('Network error');
        },
      };

      const brokenUseCase = new UnlikePost({ likeService: brokenService as any });

      // ACT
      const result = await brokenUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
      });

      // ASSERT
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });
  });
});
