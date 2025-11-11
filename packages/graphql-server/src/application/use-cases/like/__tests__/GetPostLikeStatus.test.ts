/**
 * GetPostLikeStatus Use Case Tests
 *
 * Behavior-focused tests using fake repository.
 * Tests verify behavior (outputs), not implementation details.
 */

import { describe, it, expect } from 'vitest';
import { GetPostLikeStatus } from '../GetPostLikeStatus.js';
import { FakeLikeRepository } from '../../../../../__tests__/helpers/fake-repositories.js';
import { createMockLiked } from '@social-media-app/shared/test-utils/fixtures';

describe('GetPostLikeStatus', () => {
  it('returns liked status when user has liked the post', async () => {
    const likeStatus = new Map([
      ['user-1-post-1', createMockLiked(42)],
    ]);
    const repository = new FakeLikeRepository(likeStatus);
    const useCase = new GetPostLikeStatus(repository);

    const result = await useCase.execute('user-1', 'post-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isLiked).toBe(true);
      expect(result.data.likeCount).toBe(42);
    }
  });

  it('returns not-liked status when user has not liked the post', async () => {
    const repository = new FakeLikeRepository(new Map());
    const useCase = new GetPostLikeStatus(repository);

    const result = await useCase.execute('user-1', 'post-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isLiked).toBe(false);
      expect(result.data.likeCount).toBe(0);
    }
  });

  it('includes total like count for the post', async () => {
    const likeStatus = new Map([
      ['user-1-post-1', { isLiked: false, likeCount: 99 }],
    ]);
    const repository = new FakeLikeRepository(likeStatus);
    const useCase = new GetPostLikeStatus(repository);

    const result = await useCase.execute('user-1', 'post-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.likeCount).toBe(99);
    }
  });
});
