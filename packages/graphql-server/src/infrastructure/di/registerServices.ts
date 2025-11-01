/**
 * registerServices - Wire up Dependency Graph
 *
 * Registers all services in the DI container, establishing the complete
 * dependency graph from context services → adapters → use cases.
 *
 * This function bridges the gap between:
 * - Legacy context.services (existing DAL services)
 * - Clean architecture (repositories, use cases)
 * - GraphQL resolvers (thin wrappers)
 *
 * Registration Order:
 * 1. Repository Adapters (wrap context.services)
 * 2. Use Cases (inject repositories)
 *
 * @example
 * ```typescript
 * const container = new Container();
 * registerServices(container, context);
 *
 * // Now resolvers can use:
 * const useCase = container.resolve<GetCurrentUserProfile>('GetCurrentUserProfile');
 * ```
 */

import { Container } from './Container.js';
import type { GraphQLContext } from '../../context.js';

// Adapters
import { ProfileServiceAdapter } from '../adapters/ProfileServiceAdapter.js';
import { PostServiceAdapter } from '../adapters/PostServiceAdapter.js';
import { FeedServiceAdapter } from '../adapters/FeedServiceAdapter.js';
import { CommentServiceAdapter } from '../adapters/CommentServiceAdapter.js';
import { FollowServiceAdapter } from '../adapters/FollowServiceAdapter.js';
import { LikeServiceAdapter } from '../adapters/LikeServiceAdapter.js';
import { NotificationServiceAdapter } from '../adapters/NotificationServiceAdapter.js';
import { AuctionServiceAdapter } from '../adapters/AuctionServiceAdapter.js';

// Repositories (interfaces)
import type { IProfileRepository } from '../../domain/repositories/IProfileRepository.js';
import type { IPostRepository } from '../../domain/repositories/IPostRepository.js';
import type { IFeedRepository } from '../../domain/repositories/IFeedRepository.js';
import type { ICommentRepository } from '../../domain/repositories/ICommentRepository.js';
import type { IFollowRepository } from '../../domain/repositories/IFollowRepository.js';
import type { ILikeRepository } from '../../domain/repositories/ILikeRepository.js';
import type { INotificationRepository } from '../../domain/repositories/INotificationRepository.js';
import type { IAuctionRepository } from '../../domain/repositories/IAuctionRepository.js';

// Use Cases
import { GetCurrentUserProfile } from '../../application/use-cases/profile/GetCurrentUserProfile.js';
import { GetProfileByHandle } from '../../application/use-cases/profile/GetProfileByHandle.js';
import { GetPostById } from '../../application/use-cases/post/GetPostById.js';
import { GetUserPosts } from '../../application/use-cases/post/GetUserPosts.js';
import { GetFollowingFeed } from '../../application/use-cases/feed/GetFollowingFeed.js';
import { GetExploreFeed } from '../../application/use-cases/feed/GetExploreFeed.js';
import { GetCommentsByPost } from '../../application/use-cases/comment/GetCommentsByPost.js';
import { GetFollowStatus } from '../../application/use-cases/follow/GetFollowStatus.js';
import { GetPostLikeStatus } from '../../application/use-cases/like/GetPostLikeStatus.js';
import { GetNotifications } from '../../application/use-cases/notification/GetNotifications.js';
import { GetUnreadNotificationsCount } from '../../application/use-cases/notification/GetUnreadNotificationsCount.js';
import { GetAuction } from '../../application/use-cases/auction/GetAuction.js';

/**
 * Register all services in the container.
 *
 * Wires up the complete dependency graph by:
 * 1. Wrapping context.services with adapters (repository pattern)
 * 2. Injecting repositories into use cases (dependency injection)
 *
 * This enables clean separation of concerns while maintaining
 * compatibility with existing context-based services.
 *
 * @param container - The DI container to register services in
 * @param context - GraphQL context containing DAL services
 *
 * @example
 * ```typescript
 * // In resolver setup:
 * const container = new Container();
 * registerServices(container, context);
 *
 * // In resolver:
 * const useCase = container.resolve<GetCurrentUserProfile>('GetCurrentUserProfile');
 * const result = await useCase.execute({ userId: context.userId });
 * ```
 */
export function registerServices(container: Container, context: GraphQLContext): void {
  /**
   * Layer 1: Repository Adapters
   *
   * Adapters wrap existing context.services and implement repository interfaces.
   * This provides a clean boundary between DAL services and domain logic.
   */

  container.register<IProfileRepository>('ProfileRepository', () =>
    new ProfileServiceAdapter(context.services.profileService)
  );

  container.register<IPostRepository>('PostRepository', () =>
    new PostServiceAdapter(context.services.postService)
  );

  container.register<IFeedRepository>('FeedRepository', () =>
    new FeedServiceAdapter(context.services.feedService)
  );

  container.register<ICommentRepository>('CommentRepository', () =>
    new CommentServiceAdapter(context.services.commentService)
  );

  container.register<IFollowRepository>('FollowRepository', () =>
    new FollowServiceAdapter(context.services.followService)
  );

  container.register<ILikeRepository>('LikeRepository', () =>
    new LikeServiceAdapter(context.services.likeService)
  );

  container.register<INotificationRepository>('NotificationRepository', () =>
    new NotificationServiceAdapter(context.services.notificationService)
  );

  container.register<IAuctionRepository>('AuctionRepository', () =>
    new AuctionServiceAdapter(context.services.auctionService)
  );

  /**
   * Layer 2: Use Cases
   *
   * Use cases implement business logic and depend on repository interfaces.
   * Dependencies are resolved from the container, enabling proper DI.
   */

  // Profile use cases
  container.register<GetCurrentUserProfile>('GetCurrentUserProfile', () =>
    new GetCurrentUserProfile(container.resolve('ProfileRepository'))
  );

  container.register<GetProfileByHandle>('GetProfileByHandle', () =>
    new GetProfileByHandle(container.resolve('ProfileRepository'))
  );

  // Post use cases
  container.register<GetPostById>('GetPostById', () =>
    new GetPostById(container.resolve('PostRepository'))
  );

  container.register<GetUserPosts>('GetUserPosts', () =>
    new GetUserPosts(container.resolve('PostRepository'))
  );

  // Feed use cases
  container.register<GetFollowingFeed>('GetFollowingFeed', () =>
    new GetFollowingFeed(container.resolve('FeedRepository'))
  );

  container.register<GetExploreFeed>('GetExploreFeed', () =>
    new GetExploreFeed(container.resolve('FeedRepository'))
  );

  // Comment use cases
  container.register<GetCommentsByPost>('GetCommentsByPost', () =>
    new GetCommentsByPost(container.resolve('CommentRepository'))
  );

  // Follow use cases
  container.register<GetFollowStatus>('GetFollowStatus', () =>
    new GetFollowStatus(container.resolve('FollowRepository'))
  );

  // Like use cases
  container.register<GetPostLikeStatus>('GetPostLikeStatus', () =>
    new GetPostLikeStatus(container.resolve('LikeRepository'))
  );

  // Notification use cases
  container.register<GetNotifications>('GetNotifications', () =>
    new GetNotifications(container.resolve('NotificationRepository'))
  );

  container.register<GetUnreadNotificationsCount>('GetUnreadNotificationsCount', () =>
    new GetUnreadNotificationsCount(container.resolve('NotificationRepository'))
  );

  // Auction use cases
  container.register<GetAuction>('GetAuction', () =>
    new GetAuction(container.resolve('AuctionRepository'))
  );
}
