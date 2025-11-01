/**
 * Fake Repositories for Behavior-Focused Testing
 *
 * In-memory implementations of repository interfaces.
 * Used for testing with real use cases instead of mocks.
 * No mocks, no spies - just real objects with fake data.
 */

import type { ICommentRepository, Comment } from '../../src/domain/repositories/ICommentRepository';
import type { IFollowRepository, FollowStatus } from '../../src/domain/repositories/IFollowRepository';
import type { ILikeRepository, LikeStatus } from '../../src/domain/repositories/ILikeRepository';
import type { INotificationRepository, Notification } from '../../src/domain/repositories/INotificationRepository';
import type { IAuctionRepository, Auction, Bid } from '../../src/domain/repositories/IAuctionRepository';
import type { PaginatedResult } from '../../src/shared/types/pagination';
import { success, failure, type Result } from '../../src/shared/types/result';

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

/**
 * Fake Like Repository
 * In-memory implementation for testing like use cases.
 */
export class FakeLikeRepository implements ILikeRepository {
  constructor(private likeStatus: Map<string, LikeStatus> = new Map()) {}

  async getPostLikeStatus(userId: string, postId: string): Promise<Result<LikeStatus, Error>> {
    const key = `${userId}-${postId}`;
    const status = this.likeStatus.get(key) || {
      isLiked: false,
      likeCount: 0,
    };
    return success(status);
  }
}

/**
 * Fake Notification Repository
 * In-memory implementation for testing notification use cases.
 */
export class FakeNotificationRepository implements INotificationRepository {
  constructor(private notifications: Notification[] = []) {}

  async getNotifications(
    userId: string,
    limit: number,
    cursor?: string
  ): Promise<Result<PaginatedResult<Notification>, Error>> {
    const filtered = this.notifications.filter((n) => n.userId === userId);
    const items = filtered.slice(0, limit);

    return success({
      items,
      hasMore: filtered.length > limit,
      nextCursor: filtered.length > limit ? 'next-cursor' : null,
    });
  }

  async getUnreadCount(userId: string): Promise<Result<number, Error>> {
    const count = this.notifications.filter((n) => n.userId === userId && !n.read).length;
    return success(count);
  }
}

/**
 * Fake Auction Repository
 * In-memory implementation for testing auction use cases.
 */
export class FakeAuctionRepository implements IAuctionRepository {
  constructor(
    private auctions: Auction[] = [],
    private bids: Bid[] = []
  ) {}

  async getAuction(id: string): Promise<Result<Auction, Error>> {
    const auction = this.auctions.find((a) => a.id === id);
    return auction ? success(auction) : failure(new Error('Auction not found'));
  }

  async getAuctions(
    status?: string,
    limit: number = 20,
    cursor?: string
  ): Promise<Result<PaginatedResult<Auction>, Error>> {
    let filtered = this.auctions;
    if (status) {
      filtered = filtered.filter((a) => a.status === status);
    }
    const items = filtered.slice(0, limit);

    return success({
      items,
      hasMore: filtered.length > limit,
      nextCursor: filtered.length > limit ? 'next-cursor' : null,
    });
  }

  async getBidHistory(
    auctionId: string,
    limit: number,
    cursor?: string
  ): Promise<Result<PaginatedResult<Bid>, Error>> {
    const filtered = this.bids.filter((b) => b.auctionId === auctionId);
    const items = filtered.slice(0, limit);

    return success({
      items,
      hasMore: filtered.length > limit,
      nextCursor: filtered.length > limit ? 'next-cursor' : null,
    });
  }
}
