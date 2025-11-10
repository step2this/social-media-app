/**
 * Use Case Service Adapters
 *
 * Lightweight adapters that transform DAL service responses to match use case expectations.
 *
 * Problem: DAL services return optional fields (fullName?: string) reflecting database reality,
 * but use cases expect required fields (fullName: string) for type safety.
 *
 * Solution: Adapter functions that transform optional → required by:
 * - Converting undefined to null (for nullable fields)
 * - Converting undefined to empty string (for string fields with defaults)
 * - Converting undefined to 0 (for number fields with defaults)
 *
 * Benefits:
 * - Type-safe transformations
 * - Explicit handling of optionality
 * - Centralized data transformation logic
 * - No `as any` type assertions needed
 */

import type { ProfileService, PostService, CommentService, NotificationService } from '@social-media-app/dal';
import type { AuctionService } from '@social-media-app/auction-dal';

/**
 * ProfileServiceAdapter
 *
 * Adapts ProfileService methods to return required fields instead of optional ones.
 */
export class ProfileServiceUseCaseAdapter {
  constructor(private readonly dalService: ProfileService) {}

  async getProfileById(userId: string) {
    const profile = await this.dalService.getProfileById(userId);
    if (!profile) return null;

    return {
      ...profile,
      fullName: profile.fullName ?? null,
      bio: profile.bio ?? null,
      profilePictureUrl: profile.profilePictureUrl ?? null,
      profilePictureThumbnailUrl: profile.profilePictureThumbnailUrl ?? null,
    };
  }

  async updateProfile(
    userId: string,
    data: { handle?: string; fullName?: string; bio?: string }
  ) {
    const profile = await this.dalService.updateProfile(userId, data);

    return {
      id: profile.id,
      handle: profile.handle,
      fullName: profile.fullName ?? null,
      bio: profile.bio ?? null,
      avatarUrl: profile.profilePictureUrl ?? null, // Map profilePictureUrl → avatarUrl
      followersCount: profile.followersCount,
      followingCount: profile.followingCount,
      postsCount: profile.postsCount,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  async generatePresignedUrl(
    userId: string,
    options: { fileType: string; purpose: string }
  ) {
    return this.dalService.generatePresignedUrl(userId, options as any);
  }
}

/**
 * PostServiceUseCaseAdapter
 *
 * Adapts PostService to handle caption field (optional in DAL, required in use cases).
 */
export class PostServiceUseCaseAdapter {
  constructor(private readonly dalService: PostService) {}

  async createPost(
    userId: string,
    handle: string,
    data: { fileType: string; caption?: string },
    imageUrl: string,
    thumbnailUrl: string
  ) {
    const post = await this.dalService.createPost(userId, handle, data as any, imageUrl, thumbnailUrl);

    return {
      id: post.id,
      userId: post.userId,
      imageUrl: post.imageUrl,
      thumbnailUrl: post.thumbnailUrl,
      caption: post.caption ?? null, // Transform optional → nullable
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  async updatePost(postId: string, userId: string, data: { caption?: string }) {
    const post = await this.dalService.updatePost(postId, userId, data);

    return {
      id: post.id,
      userId: post.userId,
      imageUrl: post.imageUrl,
      thumbnailUrl: post.thumbnailUrl,
      caption: post.caption ?? null, // Transform optional → nullable
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  async deletePost(postId: string, userId: string) {
    return this.dalService.deletePost(postId, userId);
  }

  async getPostById(postId: string) {
    return this.dalService.getPostById(postId);
  }
}

/**
 * CommentServiceUseCaseAdapter
 *
 * Adapts CommentService to flatten nested return structures.
 */
export class CommentServiceUseCaseAdapter {
  constructor(private readonly dalService: CommentService) {}

  async createComment(
    userId: string,
    postId: string,
    handle: string,
    content: string,
    postUserId: string,
    postSK: string
  ) {
    const result = await this.dalService.createComment(userId, postId, handle, content, postUserId, postSK);

    // Transform nested { comment: {...}, commentsCount } → flat comment object
    return {
      id: result.comment.id,
      postId: result.comment.postId,
      userId: result.comment.userId,
      content: result.comment.content,
      createdAt: result.comment.createdAt,
      updatedAt: result.comment.updatedAt,
    };
  }

  async deleteComment(commentId: string, userId: string) {
    const result = await this.dalService.deleteComment(commentId, userId);
    // Transform { success: boolean, message: string } → boolean
    return result.success;
  }
}

/**
 * NotificationServiceUseCaseAdapter
 *
 * Adapts NotificationService to handle readAt field transformations.
 */
export class NotificationServiceUseCaseAdapter {
  constructor(private readonly dalService: NotificationService) {}

  async markAsRead(params: { userId: string; notificationId: string }) {
    const result = await this.dalService.markAsRead(params);

    return {
      notification: {
        ...result.notification,
        readAt: result.notification.readAt ?? new Date().toISOString(), // Ensure readAt exists
      },
    };
  }

  async markAllAsRead(params: { userId: string }) {
    const result = await this.dalService.markAllAsRead(params.userId);
    return { updatedCount: result.updatedCount };
  }

  async deleteNotification(params: { userId: string; notificationId: string }) {
    await this.dalService.deleteNotification(params);
    // Transform object return → void
    return undefined;
  }
}

/**
 * AuctionServiceUseCaseAdapter
 *
 * Adapts AuctionService to handle field name differences (startPrice → startingPrice).
 */
export class AuctionServiceUseCaseAdapter {
  constructor(private readonly dalService: AuctionService) {}

  async createAuction(
    userId: string,
    input: {
      title: string;
      description?: string;
      startingPrice: number;
      reservePrice?: number;
      startTime: string;
      endTime: string;
    }
  ) {
    // Map startingPrice → startPrice for DAL
    const dalInput = {
      title: input.title,
      description: input.description,
      startPrice: input.startingPrice, // Field name transformation
      reservePrice: input.reservePrice,
      startTime: input.startTime,
      endTime: input.endTime,
    };

    const auction = await this.dalService.createAuction(userId, dalInput as any);

    // Map startPrice → startingPrice for use case
    return {
      id: auction.id,
      userId: auction.userId,
      title: auction.title,
      description: auction.description ?? '',
      startingPrice: auction.startPrice, // Field name transformation
      reservePrice: auction.reservePrice ?? null,
      currentPrice: auction.currentPrice,
      imageUrl: auction.imageUrl ?? null,
      status: auction.status,
      startTime: auction.startTime,
      endTime: auction.endTime,
      createdAt: auction.createdAt,
      updatedAt: auction.updatedAt,
    };
  }

  async activateAuction(auctionId: string, userId: string) {
    const auction = await this.dalService.activateAuction(auctionId);

    // Map startPrice → startingPrice
    return {
      id: auction.id,
      userId: auction.userId,
      winnerId: auction.winnerId ?? null,
      title: auction.title,
      description: auction.description ?? '',
      startingPrice: auction.startPrice, // Field name transformation
      reservePrice: auction.reservePrice ?? null,
      currentPrice: auction.currentPrice,
      imageUrl: auction.imageUrl ?? null,
      status: auction.status,
      startTime: auction.startTime,
      endTime: auction.endTime,
      createdAt: auction.createdAt,
      updatedAt: auction.updatedAt,
    };
  }

  async placeBid(userId: string, input: { auctionId: string; amount: number }) {
    const result = await this.dalService.placeBid(userId, input);

    return {
      bid: {
        id: result.bid.id,
        auctionId: result.bid.auctionId,
        userId: result.bid.userId,
        amount: result.bid.amount,
        createdAt: result.bid.createdAt,
      },
      auction: {
        id: result.auction.id,
        userId: result.auction.userId,
        winnerId: result.auction.winnerId ?? null,
        title: result.auction.title,
        description: result.auction.description ?? '',
        startingPrice: result.auction.startPrice, // Field name transformation
        reservePrice: result.auction.reservePrice ?? null,
        currentPrice: result.auction.currentPrice,
        imageUrl: result.auction.imageUrl ?? null,
        status: result.auction.status,
        startTime: result.auction.startTime,
        endTime: result.auction.endTime,
        createdAt: result.auction.createdAt,
        updatedAt: result.auction.updatedAt,
      },
    };
  }
}
