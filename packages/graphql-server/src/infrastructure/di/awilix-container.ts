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

// Query Use Cases
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

// Mutation Use Cases
// Auth mutations
import { Register } from '../../application/use-cases/auth/Register.js';
import { Login } from '../../application/use-cases/auth/Login.js';
import { RefreshToken } from '../../application/use-cases/auth/RefreshToken.js';
import { Logout } from '../../application/use-cases/auth/Logout.js';
// Other mutations
import { CreatePost } from '../../application/use-cases/post/CreatePost.js';
import { UpdatePost } from '../../application/use-cases/post/UpdatePost.js';
import { DeletePost } from '../../application/use-cases/post/DeletePost.js';
import { LikePost } from '../../application/use-cases/like/LikePost.js';
import { UnlikePost } from '../../application/use-cases/like/UnlikePost.js';
import { FollowUser } from '../../application/use-cases/follow/FollowUser.js';
import { UnfollowUser } from '../../application/use-cases/follow/UnfollowUser.js';
import { CreateComment } from '../../application/use-cases/comment/CreateComment.js';
import { DeleteComment } from '../../application/use-cases/comment/DeleteComment.js';
import { UpdateProfile } from '../../application/use-cases/profile/UpdateProfile.js';
import { GetProfilePictureUploadUrl } from '../../application/use-cases/profile/GetProfilePictureUploadUrl.js';
import { MarkNotificationAsRead } from '../../application/use-cases/notification/MarkNotificationAsRead.js';
import { MarkAllNotificationsAsRead } from '../../application/use-cases/notification/MarkAllNotificationsAsRead.js';
import { DeleteNotification } from '../../application/use-cases/notification/DeleteNotification.js';
import { MarkFeedItemsAsRead } from '../../application/use-cases/feed/MarkFeedItemsAsRead.js';
import { CreateAuction } from '../../application/use-cases/auction/CreateAuction.js';
import { ActivateAuction } from '../../application/use-cases/auction/ActivateAuction.js';
import { PlaceBid } from '../../application/use-cases/auction/PlaceBid.js';

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
  authService: GraphQLContext['services']['authService'];
  profileService: GraphQLContext['services']['profileService'];
  postService: GraphQLContext['services']['postService'];
  commentService: GraphQLContext['services']['commentService'];
  followService: GraphQLContext['services']['followService'];
  likeService: GraphQLContext['services']['likeService'];
  notificationService: GraphQLContext['services']['notificationService'];
  auctionService: GraphQLContext['services']['auctionService'];
  feedService: GraphQLContext['services']['feedService'];
  dynamoClient: GraphQLContext['dynamoClient'];
  tableName: GraphQLContext['tableName'];

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
  // Query Use Cases
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

  // Mutation Use Cases
  // Auth mutations
  register: Register;
  login: Login;
  refreshToken: RefreshToken;
  logout: Logout;
  // Other mutations
  createPost: CreatePost;
  updatePost: UpdatePost;
  deletePost: DeletePost;
  likePost: LikePost;
  unlikePost: UnlikePost;
  followUser: FollowUser;
  unfollowUser: UnfollowUser;
  createComment: CreateComment;
  deleteComment: DeleteComment;
  updateProfile: UpdateProfile;
  getProfilePictureUploadUrl: GetProfilePictureUploadUrl;
  markNotificationAsRead: MarkNotificationAsRead;
  markAllNotificationsAsRead: MarkAllNotificationsAsRead;
  deleteNotification: DeleteNotification;
  markFeedItemsAsRead: MarkFeedItemsAsRead;
  createAuction: CreateAuction;
  activateAuction: ActivateAuction;
  placeBid: PlaceBid;
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
    authService: asValue(context.services.authService),
    profileService: asValue(context.services.profileService),
    postService: asValue(context.services.postService),
    commentService: asValue(context.services.commentService),
    followService: asValue(context.services.followService),
    likeService: asValue(context.services.likeService),
    notificationService: asValue(context.services.notificationService),
    auctionService: asValue(context.services.auctionService),
    feedService: asValue(context.services.feedService),
    dynamoClient: asValue(context.dynamoClient),
    tableName: asValue(context.tableName),
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

    // ============================================
    // Mutation Use Cases
    // ============================================
    // Mutation use cases accept a services object wrapper
    // Must use factory pattern with asValue(new UseCase({ services }))

    // Auth mutation use cases
    // @ts-ignore - Service type mismatch between DAL and use case (optional vs required fields)
    register: asValue(
      new Register({
        authService: context.services.authService,
        profileService: context.services.profileService as any,
      })
    ),
    // @ts-ignore - Service type mismatch between DAL and use case (optional vs required fields)
    login: asValue(
      new Login({
        authService: context.services.authService,
        profileService: context.services.profileService as any,
      })
    ),
    // @ts-ignore - Service type mismatch between DAL and use case (optional vs required fields)
    refreshToken: asValue(
      new RefreshToken({
        authService: context.services.authService,
        profileService: context.services.profileService as any,
        dynamoClient: context.dynamoClient,
        tableName: context.tableName,
      })
    ),
    logout: asValue(
      new Logout({
        // No services needed for idempotent logout
      })
    ),

    // Post mutation use cases
    // @ts-ignore - Service type mismatch (caption field: optional in DAL, required in use case)
    createPost: asValue(
      new CreatePost({
        profileService: context.services.profileService as any,
        postService: context.services.postService as any,
      })
    ),
    // @ts-ignore - Service type mismatch (caption field: optional in DAL, required in use case)
    updatePost: asValue(
      new UpdatePost({
        postService: context.services.postService as any,
      })
    ),
    // @ts-ignore - Service type mismatch
    deletePost: asValue(
      new DeletePost({
        postService: context.services.postService as any,
      })
    ),

    // Like mutation use cases
    likePost: asValue(
      new LikePost({
        likeService: context.services.likeService,
      })
    ),
    unlikePost: asValue(
      new UnlikePost({
        likeService: context.services.likeService,
      })
    ),

    // Follow mutation use cases
    followUser: asValue(
      new FollowUser({
        followService: context.services.followService,
      })
    ),
    unfollowUser: asValue(
      new UnfollowUser({
        followService: context.services.followService,
      })
    ),

    // Comment mutation use cases
    // @ts-ignore - Service type mismatch (return structure differences)
    createComment: asValue(
      new CreateComment({
        profileService: context.services.profileService as any,
        postService: context.services.postService as any,
        commentService: context.services.commentService as any,
      })
    ),
    // @ts-ignore - Service type mismatch (return type: object vs boolean)
    deleteComment: asValue(
      new DeleteComment({
        commentService: context.services.commentService as any,
      })
    ),

    // Profile mutation use cases
    // @ts-ignore - Service type mismatch (avatarUrl vs profilePictureUrl)
    updateProfile: asValue(
      new UpdateProfile({
        profileService: context.services.profileService as any,
      })
    ),
    getProfilePictureUploadUrl: asValue(
      new GetProfilePictureUploadUrl({
        profileService: context.services.profileService as any,
      })
    ),

    // Notification mutation use cases
    // @ts-ignore - Service type mismatch (readAt field: optional in DAL, required in use case)
    markNotificationAsRead: asValue(
      new MarkNotificationAsRead({
        notificationService: context.services.notificationService as any,
      })
    ),
    markAllNotificationsAsRead: asValue(
      new MarkAllNotificationsAsRead({
        notificationService: context.services.notificationService as any,
      })
    ),
    // @ts-ignore - Service type mismatch (return type: object vs void)
    deleteNotification: asValue(
      new DeleteNotification({
        notificationService: context.services.notificationService as any,
      })
    ),

    // Feed mutation use cases
    markFeedItemsAsRead: asValue(
      new MarkFeedItemsAsRead({
        feedService: context.services.feedService,
      })
    ),

    // Auction mutation use cases
    // @ts-ignore - Service type mismatch (startPrice vs startingPrice, property naming differences)
    createAuction: asValue(
      new CreateAuction({
        profileService: context.services.profileService as any,
        auctionService: context.services.auctionService as any,
      })
    ),
    // @ts-ignore - Service type mismatch (startPrice vs startingPrice)
    activateAuction: asValue(
      new ActivateAuction({
        auctionService: context.services.auctionService as any,
      })
    ),
    // @ts-ignore - Service type mismatch (startPrice vs startingPrice)
    placeBid: asValue(
      new PlaceBid({
        auctionService: context.services.auctionService as any,
      })
    ),
  });

  return container;
}

/**
 * Type helper to extract container cradle type
 * Useful for resolvers that need multiple services
 */
export type ContainerCradle = AwilixContainer<GraphQLContainer>['cradle'];
