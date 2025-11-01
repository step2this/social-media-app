/**
 * Fake Repositories for Behavior-Focused Testing
 *
 * In-memory implementations of repository interfaces.
 * Used for testing with real use cases instead of mocks.
 * No mocks, no spies - just real objects with fake data.
 */

import type { ICommentRepository, Comment } from '../../src/domain/repositories/ICommentRepository';
import type { IFollowRepository, FollowStatus } from '../../src/domain/repositories/IFollowRepository';
import type { PaginatedResult } from '../../src/shared/types/pagination';
import { success, type Result } from '../../src/shared/types/result';

/**
 * Fake Comment Repository
 * In-memory implementation for testing comment use cases.
 */
export class FakeCommentRepository implements ICommentRepository {
  constructor(private comments: Comment[] = []) {}

  async getCommentsByPost(
    postId: string,
    limit: number,
    cursor?: string
  ): Promise<Result<PaginatedResult<Comment>, Error>> {
    const filtered = this.comments.filter((c) => c.postId === postId);
    const items = filtered.slice(0, limit);

    return success({
      items,
      hasMore: filtered.length > limit,
      nextCursor: filtered.length > limit ? 'next-cursor' : null,
    });
  }
}

/**
 * Fake Follow Repository
 * In-memory implementation for testing follow use cases.
 */
export class FakeFollowRepository implements IFollowRepository {
  constructor(private followStatus: Map<string, FollowStatus> = new Map()) {}

  async getFollowStatus(
    followerId: string,
    followeeId: string
  ): Promise<Result<FollowStatus, Error>> {
    const key = `${followerId}-${followeeId}`;
    const status = this.followStatus.get(key) || {
      isFollowing: false,
      followersCount: 0,
      followingCount: 0,
    };
    return success(status);
  }
}
