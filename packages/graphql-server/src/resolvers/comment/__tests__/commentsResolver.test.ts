/**
 * Comments Resolver Tests
 *
 * Behavior-focused integration tests using real use case + fake repository.
 * Tests verify resolver behavior, not implementation details.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GraphQLResolveInfo } from 'graphql';
import { createCommentsResolver } from '../commentsResolver';
import { Container } from '../../../infrastructure/di/Container';
import { GetCommentsByPost } from '../../../application/use-cases/comment/GetCommentsByPost';
import { FakeCommentRepository } from '../../../../__tests__/helpers/fake-repositories';
import { createMockComments } from '@social-media-app/shared/test-utils/fixtures';
import type { GraphQLContext } from '../../../context';

describe('commentsResolver', () => {
  let container: Container;
  let resolver: ReturnType<typeof createCommentsResolver>;

  beforeEach(() => {
    container = new Container();
  });

  it('returns comments as a valid connection', async () => {
    const comments = createMockComments(5, { postId: 'post-1' });
    const repository = new FakeCommentRepository(comments);
    const useCase = new GetCommentsByPost(repository);
    container.register('GetCommentsByPost', () => useCase);
    resolver = createCommentsResolver(container);

    const result = await resolver!(
      {} as any,
      { postId: 'post-1', limit: 20 },
      {} as GraphQLContext,
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
    container.register('GetCommentsByPost', () => useCase);
    resolver = createCommentsResolver(container);

    const result = await resolver!(
      {} as any,
      { postId: 'post-1', limit: 20 },
      {} as GraphQLContext,
      {} as GraphQLResolveInfo
    );

    expect(result.edges).toHaveLength(0);
    expect(result.pageInfo.hasNextPage).toBe(false);
  });

  it('indicates pagination when more comments are available', async () => {
    const comments = createMockComments(25, { postId: 'post-1' });
    const repository = new FakeCommentRepository(comments);
    const useCase = new GetCommentsByPost(repository);
    container.register('GetCommentsByPost', () => useCase);
    resolver = createCommentsResolver(container);

    const result = await resolver!(
      {} as any,
      { postId: 'post-1', limit: 20 },
      {} as GraphQLContext,
      {} as GraphQLResolveInfo
    );

    expect(result.edges).toHaveLength(20);
    expect(result.pageInfo.hasNextPage).toBe(true);
  });
});
