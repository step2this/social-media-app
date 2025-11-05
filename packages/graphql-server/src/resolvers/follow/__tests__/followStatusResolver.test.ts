/**
 * FollowStatus Resolver Tests
 *
 * Behavior-focused integration tests using real use case + fake repository.
 * Tests verify resolver behavior, not implementation details.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GraphQLResolveInfo } from 'graphql';
import { createFollowStatusResolver } from '../followStatusResolver';
import { Container } from '../../../infrastructure/di/Container';
import { GetFollowStatus } from '../../../application/use-cases/follow/GetFollowStatus';
import { FakeFollowRepository } from '../../../../__tests__/helpers/fake-repositories';
import type { GraphQLContext } from '../../../context';

describe('followStatusResolver', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  it('returns following status when user is following', async () => {
    const followStatus = new Map([
      ['user-1-user-2', { isFollowing: true, followersCount: 0, followingCount: 0 }],
    ]);
    const repository = new FakeFollowRepository(followStatus);
    const useCase = new GetFollowStatus(repository);
    container.register('GetFollowStatus', () => useCase);
    const resolver = createFollowStatusResolver(container);

    const result = await resolver!(
      {} as any,
      { followeeId: 'user-2' },
      { userId: 'user-1' } as GraphQLContext,
      {} as GraphQLResolveInfo
    );

    expect(result.isFollowing).toBe(true);
  });

  it('returns not-following status when user is not following', async () => {
    const repository = new FakeFollowRepository(new Map());
    const useCase = new GetFollowStatus(repository);
    container.register('GetFollowStatus', () => useCase);
    const resolver = createFollowStatusResolver(container);

    const result = await resolver!(
      {} as any,
      { followeeId: 'user-2' },
      { userId: 'user-1' } as GraphQLContext,
      {} as GraphQLResolveInfo
    );

    expect(result.isFollowing).toBe(false);
  });

  it('includes follower and following counts', async () => {
    const followStatus = new Map([
      ['user-1-user-2', { isFollowing: true, followersCount: 150, followingCount: 75 }],
    ]);
    const repository = new FakeFollowRepository(followStatus);
    const useCase = new GetFollowStatus(repository);
    container.register('GetFollowStatus', () => useCase);
    const resolver = createFollowStatusResolver(container);

    const result = await resolver!(
      {} as any,
      { followeeId: 'user-2' },
      { userId: 'user-1' } as GraphQLContext,
      {} as GraphQLResolveInfo
    );

    expect(result.followersCount).toBe(150);
    expect(result.followingCount).toBe(75);
  });
});
