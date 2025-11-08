/**
 * Awilix Container for GraphQL Server
 *
 * Replaces custom Container with Awilix for:
 * - Automatic constructor injection
 * - Proper lifecycle management (singleton, scoped, transient)
 * - Type-safe service resolution
 *
 * Architecture Layers:
 * 1. Context (provided externally) - VALUE
 * 2. Repository Adapters (wrap context.services) - SCOPED
 * 3. Use Cases (business logic) - SCOPED
 *
 * Benefits over custom Container:
 * - Automatic dependency resolution (no manual wiring)
 * - Constructor injection (cleaner code)
 * - Lifecycle management (memory efficiency)
 * - Better type inference
 *
 * @module infrastructure/di
 */

import {
  createContainer,
  asClass,
  asValue,
  InjectionMode,
  type AwilixContainer,
} from 'awilix';
import type { GraphQLContext } from '../../context.js';

// Repository Adapters
import { ProfileServiceAdapter } from '../adapters/ProfileServiceAdapter.js';
import { PostServiceAdapter } from '../adapters/PostServiceAdapter.js';
import { CommentServiceAdapter } from '../adapters/CommentServiceAdapter.js';
import { FollowServiceAdapter } from '../adapters/FollowServiceAdapter.js';
import { LikeServiceAdapter } from '../adapters/LikeServiceAdapter.js';
import { NotificationServiceAdapter } from '../adapters/NotificationServiceAdapter.js';
import { AuctionServiceAdapter } from '../adapters/AuctionServiceAdapter.js';
import { FeedServiceAdapter } from '../adapters/FeedServiceAdapter.js';

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
import { GetAuctions } from '../../application/use-cases/auction/GetAuctions.js';
import { GetBidHistory } from '../../application/use-cases/auction/GetBidHistory.js';

/**
 * Container interface - all resolvable dependencies
 *
 * This interface provides type safety for container.resolve() calls.
 * TypeScript will autocomplete and type-check service names.
 */
export interface GraphQLContainer {
  // Context (provided externally)
  context: GraphQLContext;

  // DAL Services (internal - used for adapter injection)
  // These are registered so Awilix can inject them into repository adapters
  profileService: GraphQLContext['services']['profileService'];
  postService: GraphQLContext['services']['postService'];
  commentService: GraphQLContext['services']['commentService'];
  followService: GraphQLContext['services']['followService'];
  likeService: GraphQLContext['services']['likeService'];
  notificationService: GraphQLContext['services']['notificationService'];
  auctionService: GraphQLContext['services']['auctionService'];

  // Repository Layer (adapters wrapping DAL services)
  profileRepository: ProfileServiceAdapter;
  postRepository: PostServiceAdapter;
  commentRepository: CommentServiceAdapter;
  followRepository: FollowServiceAdapter;
  likeRepository: LikeServiceAdapter;
  notificationRepository: NotificationServiceAdapter;
  auctionRepository: AuctionServiceAdapter;
  feedRepository: FeedServiceAdapter;

  // Use Case Layer (business logic)
  getCurrentUserProfile: GetCurrentUserProfile;
  getProfileByHandle: GetProfileByHandle;
  getPostById: GetPostById;
  getUserPosts: GetUserPosts;
  getFollowingFeed: GetFollowingFeed;
  getExploreFeed: GetExploreFeed;
  getCommentsByPost: GetCommentsByPost;
  getFollowStatus: GetFollowStatus;
  getPostLikeStatus: GetPostLikeStatus;
  getNotifications: GetNotifications;
  getUnreadNotificationsCount: GetUnreadNotificationsCount;
  getAuction: GetAuction;
  getAuctions: GetAuctions;
  getBidHistory: GetBidHistory;
}

/**
 * Create Awilix container for GraphQL resolvers
 *
 * This function sets up the complete dependency graph:
 * - Context services → Repository Adapters → Use Cases
 *
 * Awilix automatically handles:
 * - Constructor parameter injection
 * - Dependency resolution order
 * - Circular dependency detection
 *
 * @param context - GraphQL context with DAL services
 * @returns Configured Awilix container with all dependencies
 *
 * @example
 * ```typescript
 * // In context creation:
 * const container = createGraphQLContainer(context)
 *
 * // In resolver:
 * const useCase = container.resolve('getCurrentUserProfile')
 * const result = await useCase.execute({ userId: context.userId })
 * ```
 */
export function createGraphQLContainer(
  context: GraphQLContext
): AwilixContainer<GraphQLContainer> {
  const container = createContainer<GraphQLContainer>({
    // CLASSIC mode: Use constructor parameter names for injection
    // This enables automatic dependency resolution without decorators
    injectionMode: InjectionMode.CLASSIC,
  });

  // ============================================
  // Layer 0: Context & DAL Services
  // ============================================
  // Register context as singleton value
  container.register({
    context: asValue(context),
  });

  // Register DAL services so Awilix can inject them into adapters
  // Using constructor parameter name matching (CLASSIC injection mode)
  container.register({
    profileService: asValue(context.services.profileService),
    postService: asValue(context.services.postService),
    commentService: asValue(context.services.commentService),
    followService: asValue(context.services.followService),
    likeService: asValue(context.services.likeService),
    notificationService: asValue(context.services.notificationService),
    auctionService: asValue(context.services.auctionService),
  });

  // ============================================
  // Layer 1: Repository Adapters (SCOPED)
  // ============================================
  // Adapters wrap DAL services and implement repository interfaces
  // Using asClass with CLASSIC injection mode:
  // - Awilix reads constructor parameter names (e.g., "profileService")
  // - Automatically injects matching services from Layer 0
  // - No manual wiring needed!

  container.register({
    profileRepository: asClass(ProfileServiceAdapter).scoped(),
    postRepository: asClass(PostServiceAdapter).scoped(),
    commentRepository: asClass(CommentServiceAdapter).scoped(),
    followRepository: asClass(FollowServiceAdapter).scoped(),
    likeRepository: asClass(LikeServiceAdapter).scoped(),
    notificationRepository: asClass(NotificationServiceAdapter).scoped(),
    auctionRepository: asClass(AuctionServiceAdapter).scoped(),

    // FeedServiceAdapter needs both postService and followService
    // Awilix will automatically inject both
    feedRepository: asClass(FeedServiceAdapter).scoped(),
  });

  // ============================================
  // Layer 2: Use Cases (SCOPED)
  // ============================================
  // Use cases implement business logic
  // Using asClass with CLASSIC injection mode:
  // - Awilix automatically reads constructor parameter names
  // - Injects matching dependencies from container
  // - No manual wiring needed!

  container.register({
    // Profile use cases
    // GetCurrentUserProfile constructor: (profileRepository: IProfileRepository)
    // Awilix automatically injects profileRepository from Layer 1
    getCurrentUserProfile: asClass(GetCurrentUserProfile).scoped(),
    getProfileByHandle: asClass(GetProfileByHandle).scoped(),

    // Post use cases
    getPostById: asClass(GetPostById).scoped(),
    getUserPosts: asClass(GetUserPosts).scoped(),

    // Feed use cases
    getFollowingFeed: asClass(GetFollowingFeed).scoped(),
    getExploreFeed: asClass(GetExploreFeed).scoped(),

    // Comment use cases
    getCommentsByPost: asClass(GetCommentsByPost).scoped(),

    // Follow use cases
    getFollowStatus: asClass(GetFollowStatus).scoped(),

    // Like use cases
    getPostLikeStatus: asClass(GetPostLikeStatus).scoped(),

    // Notification use cases
    getNotifications: asClass(GetNotifications).scoped(),
    getUnreadNotificationsCount: asClass(GetUnreadNotificationsCount).scoped(),

    // Auction use cases
    getAuction: asClass(GetAuction).scoped(),
    getAuctions: asClass(GetAuctions).scoped(),
    getBidHistory: asClass(GetBidHistory).scoped(),
  });

  return container;
}

/**
 * Type helper to extract container cradle type
 * Useful for resolvers that need multiple services
 */
export type ContainerCradle = AwilixContainer<GraphQLContainer>['cradle'];
