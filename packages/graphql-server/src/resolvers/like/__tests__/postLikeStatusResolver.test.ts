/**
 * PostLikeStatus Resolver Tests
 *
 * Behavior-focused integration tests using real use case + fake repository.
 * Tests verify resolver behavior, not implementation details.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createPostLikeStatusResolver } from '../postLikeStatusResolver';
import { Container } from '../../../infrastructure/di/Container';
import { GetPostLikeStatus } from '../../../application/use-cases/like/GetPostLikeStatus';
import { FakeLikeRepository } from '../../../../__tests__/helpers/fake-repositories';
import { createMockLiked, createMockNotLiked } from '@social-media-app/shared/test-utils/fixtures';

describe('postLikeStatusResolver', () => {
  let container: Container;
  let resolver: ReturnType<typeof createPostLikeStatusResolver>;

  beforeEach(() => {
    container = new Container();
  });

  it('returns liked status when user has liked the post', async () => {
    const likeStatus = new Map([
      ['user-1-post-1', createMockLiked(42)],
    ]);
    const repository = new FakeLikeRepository(likeStatus);
    const useCase = new GetPostLikeStatus(repository);
    container.register('GetPostLikeStatus', () => useCase);
    resolver = createPostLikeStatusResolver(container);

    const result = await resolver({}, { postId: 'post-1' }, { userId: 'user-1' } as any, {} as any);

    expect(result.isLiked).toBe(true);
    expect(result.likeCount).toBe(42);
  });

  it('returns not-liked status when user has not liked the post', async () => {
    const repository = new FakeLikeRepository(new Map());
    const useCase = new GetPostLikeStatus(repository);
    container.register('GetPostLikeStatus', () => useCase);
    resolver = createPostLikeStatusResolver(container);

    const result = await resolver({}, { postId: 'post-1' }, { userId: 'user-1' } as any, {} as any);

    expect(result.isLiked).toBe(false);
    expect(result.likeCount).toBe(0);
  });

  it('includes total like count for the post', async () => {
    const likeStatus = new Map([
      ['user-1-post-1', { isLiked: false, likeCount: 99 }],
    ]);
    const repository = new FakeLikeRepository(likeStatus);
    const useCase = new GetPostLikeStatus(repository);
    container.register('GetPostLikeStatus', () => useCase);
    resolver = createPostLikeStatusResolver(container);

    const result = await resolver({}, { postId: 'post-1' }, { userId: 'user-1' } as any, {} as any);

    expect(result.likeCount).toBe(99);
  });
});
