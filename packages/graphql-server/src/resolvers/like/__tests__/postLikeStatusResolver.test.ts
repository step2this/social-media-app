/**
 * PostLikeStatus Resolver Tests
 *
 * Behavior-focused integration tests using real use case + fake repository.
 * Tests verify resolver behavior, not implementation details.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GraphQLResolveInfo } from 'graphql';
import { createContainer, asValue, InjectionMode, type AwilixContainer } from 'awilix';
import type { GraphQLContainer } from '../../../infrastructure/di/awilix-container';
import { createPostLikeStatusResolver } from '../postLikeStatusResolver';
import { GetPostLikeStatus } from '../../../application/use-cases/like/GetPostLikeStatus';
import { FakeLikeRepository } from '../../../../__tests__/helpers/fake-repositories';
import { createMockLiked } from '@social-media-app/shared/test-utils/fixtures';
import { createMockGraphQLContext } from '../../../__tests__/helpers/mock-context-factory';

describe('postLikeStatusResolver', () => {
  let container: AwilixContainer<GraphQLContainer>;

  beforeEach(() => {
    container = createContainer<GraphQLContainer>({
      injectionMode: InjectionMode.CLASSIC,
    });
  });

  it('returns liked status when user has liked the post', async () => {
    const likeStatus = new Map([
      ['user-1-post-1', createMockLiked(42)],
    ]);
    const repository = new FakeLikeRepository(likeStatus);
    const useCase = new GetPostLikeStatus(repository);
    container.register({
      getPostLikeStatus: asValue(useCase),
    });
    const resolver = createPostLikeStatusResolver(container);

    const result = await resolver!(
      {} as any,
      { postId: 'post-1' },
      createMockGraphQLContext({ userId: 'user-1' }),
      {} as GraphQLResolveInfo
    );

    expect(result.isLiked).toBe(true);
    expect(result.likeCount).toBe(42);
  });

  it('returns not-liked status when user has not liked the post', async () => {
    const repository = new FakeLikeRepository(new Map());
    const useCase = new GetPostLikeStatus(repository);
    container.register({
      getPostLikeStatus: asValue(useCase),
    });
    const resolver = createPostLikeStatusResolver(container);

    const result = await resolver!(
      {} as any,
      { postId: 'post-1' },
      createMockGraphQLContext({ userId: 'user-1' }),
      {} as GraphQLResolveInfo
    );

    expect(result.isLiked).toBe(false);
    expect(result.likeCount).toBe(0);
  });

  it('includes total like count for the post', async () => {
    const likeStatus = new Map([
      ['user-1-post-1', { isLiked: false, likeCount: 99 }],
    ]);
    const repository = new FakeLikeRepository(likeStatus);
    const useCase = new GetPostLikeStatus(repository);
    container.register({
      getPostLikeStatus: asValue(useCase),
    });
    const resolver = createPostLikeStatusResolver(container);

    const result = await resolver!(
      {} as any,
      { postId: 'post-1' },
      createMockGraphQLContext({ userId: 'user-1' }),
      {} as GraphQLResolveInfo
    );

    expect(result.likeCount).toBe(99);
  });
});
