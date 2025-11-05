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
import { type Result } from '../../src/shared/types/result';
/**
 * Fake Comment Repository
 * In-memory implementation for testing comment use cases.
 */
export declare class FakeCommentRepository implements ICommentRepository {
    private comments;
    constructor(comments?: Comment[]);
    getCommentsByPost(postId: string, limit: number, cursor?: string): Promise<Result<PaginatedResult<Comment>, Error>>;
}
/**
 * Fake Follow Repository
 * In-memory implementation for testing follow use cases.
 */
export declare class FakeFollowRepository implements IFollowRepository {
    private followStatus;
    constructor(followStatus?: Map<string, FollowStatus>);
    getFollowStatus(followerId: string, followeeId: string): Promise<Result<FollowStatus, Error>>;
}
/**
 * Fake Like Repository
 * In-memory implementation for testing like use cases.
 */
export declare class FakeLikeRepository implements ILikeRepository {
    private likeStatus;
    constructor(likeStatus?: Map<string, LikeStatus>);
    getPostLikeStatus(userId: string, postId: string): Promise<Result<LikeStatus, Error>>;
}
/**
 * Fake Notification Repository
 * In-memory implementation for testing notification use cases.
 */
export declare class FakeNotificationRepository implements INotificationRepository {
    private notifications;
    constructor(notifications?: Notification[]);
    getNotifications(userId: string, limit: number, cursor?: string): Promise<Result<PaginatedResult<Notification>, Error>>;
    getUnreadCount(userId: string): Promise<Result<number, Error>>;
}
/**
 * Fake Auction Repository
 * In-memory implementation for testing auction use cases.
 */
export declare class FakeAuctionRepository implements IAuctionRepository {
    private auctions;
    private bids;
    constructor(auctions?: Auction[], bids?: Bid[]);
    getAuction(id: string): Promise<Result<Auction, Error>>;
    getAuctions(status?: string, limit?: number, cursor?: string): Promise<Result<PaginatedResult<Auction>, Error>>;
    getBidHistory(auctionId: string, limit: number, cursor?: string): Promise<Result<PaginatedResult<Bid>, Error>>;
}
//# sourceMappingURL=fake-repositories.d.ts.map