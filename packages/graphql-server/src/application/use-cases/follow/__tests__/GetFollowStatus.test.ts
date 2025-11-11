/**
 * GetFollowStatus Use Case Tests
 *
 * Behavior-focused tests using fake repository.
 * Tests verify behavior (outputs), not implementation details.
 */

import { describe, it, expect } from 'vitest';
import { GetFollowStatus } from '../GetFollowStatus.js';
import { FakeFollowRepository } from '../../../../../__tests__/helpers/fake-repositories.js';
import { createMockFollowing } from '@social-media-app/shared/test-utils/fixtures';

describe('GetFollowStatus', () => {
  it('returns following status when user is following', async () => {
    const followStatus = new Map([
      ['user-1-user-2', createMockFollowing()],
    ]);
    const repository = new FakeFollowRepository(followStatus);
    const useCase = new GetFollowStatus(repository);

    const result = await useCase.execute('user-1', 'user-2');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isFollowing).toBe(true);
    }
  });

  it('returns not-following status when user is not following', async () => {
    const repository = new FakeFollowRepository(new Map());
    const useCase = new GetFollowStatus(repository);

    const result = await useCase.execute('user-1', 'user-2');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isFollowing).toBe(false);
    }
  });

  it('includes follower and following counts in status', async () => {
    const followStatus = new Map([
      ['user-1-user-2', { isFollowing: true, followersCount: 100, followingCount: 50 }],
    ]);
    const repository = new FakeFollowRepository(followStatus);
    const useCase = new GetFollowStatus(repository);

    const result = await useCase.execute('user-1', 'user-2');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.followersCount).toBe(100);
      expect(result.data.followingCount).toBe(50);
    }
  });
});
