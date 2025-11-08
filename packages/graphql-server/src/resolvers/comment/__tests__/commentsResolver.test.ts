/**
 * Comments Resolver Tests
 *
 * Behavior-focused integration tests using real use case + fake repository.
 * Tests verify resolver behavior, not implementation details.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GraphQLResolveInfo } from 'graphql';
import { createContainer, asValue, InjectionMode, type AwilixContainer } from 'awilix';
import type { GraphQLContainer } from '../../../infrastructure/di/awilix-container';
import { createCommentsResolver } from '../commentsResolver';
import { GetCommentsByPost } from '../../../application/use-cases/comment/GetCommentsByPost';
import { FakeCommentRepository } from '../../../../__tests__/helpers/fake-repositories';
import { createMockComments } from '@social-media-app/shared/test-utils/fixtures';
import type { GraphQLContext } from '../../../context';
import { createMockGraphQLContext } from '../../../__tests__/helpers/mock-context-factory.js';

describe('commentsResolver', () => {
  let container: AwilixContainer<GraphQLContainer>;
  let resolver: ReturnType<typeof createCommentsResolver>;

  beforeEach(() => {
    container = createContainer<GraphQLContainer>({
      injectionMode: InjectionMode.CLASSIC,
    });
  });

  it('returns comments as a valid connection', async () => {
    const comments = createMockComments(5, { postId: 'post-1' });
    const repository = new FakeCommentRepository(comments);
    const useCase = new GetCommentsByPost(repository);
    container.register({
      getCommentsByPost: asValue(useCase),
    });
    resolver = createCommentsResolver(container);

    const context = createMockGraphQLContext();
    const result = await resolver!(
      {} as any,
      { postId: 'post-1', limit: 20 },
      context,
      {} as GraphQLResolveInfo
    );

    expect(result.edges).toHaveLength(5);
    expect(result.edges[0].node.postId).toBe('post-1');
    expect(result.pageInfo.hasNextPage).toBe(false);
    expect(result.pageInfo.hasPreviousPage).toBe(false);
  });

  it('returns empty connection when no comments exist', async () => {
    const repository = new FakeCommentRepository([]);
    const useCase = new GetCommentsByPost(repository);
    container.register({
      getCommentsByPost: asValue(useCase),
    });
    resolver = createCommentsResolver(container);

    const context = createMockGraphQLContext();
    const result = await resolver!(
      {} as any,
      { postId: 'post-1', limit: 20 },
      context,
      {} as GraphQLResolveInfo
    );

    expect(result.edges).toHaveLength(0);
    expect(result.pageInfo.hasNextPage).toBe(false);
  });

  it('indicates pagination when more comments are available', async () => {
    const comments = createMockComments(25, { postId: 'post-1' });
    const repository = new FakeCommentRepository(comments);
    const useCase = new GetCommentsByPost(repository);
    container.register({
      getCommentsByPost: asValue(useCase),
    });
    resolver = createCommentsResolver(container);

    const context = createMockGraphQLContext();
    const result = await resolver!(
      {} as any,
      { postId: 'post-1', limit: 20 },
      context,
      {} as GraphQLResolveInfo
    );

    expect(result.edges).toHaveLength(20);
    expect(result.pageInfo.hasNextPage).toBe(true);
  });
});
