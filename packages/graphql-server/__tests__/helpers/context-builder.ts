/**
 * Context Builder for GraphQL Tests
 *
 * Provides a fluent API for creating GraphQL execution contexts with mock services.
 * Follows the Builder pattern for clean, readable test setup.
 *
 * @example
 * ```typescript
 * import { ContextBuilder } from '../helpers/context-builder';
 *
 * const context = ContextBuilder.create()
 *   .authenticated('user-123')
 *   .withServices({ postService: mockPostService })
 *   .build();
 * ```
 */

import { vi } from 'vitest';
import type { GraphQLContext } from '../../src/context.js';
import { createLoaders } from '../../src/dataloaders/index.js';
import type {
  ProfileService,
  PostService,
  LikeService,
  CommentService,
  FollowService,
  FeedService,
  NotificationService,
} from '@social-media-app/dal';
import type { AuctionService } from '@social-media-app/auction-dal';
import { createMockPublicProfile } from '@social-media-app/shared/test-utils';
import { TEST_USERS } from './feed-query-constants.js';

/**
 * Default test user ID
 */
export const TEST_USER_ID = 'test-user-123';

/**
 * Context Builder class
 * Provides fluent API for creating test contexts
 */
export class ContextBuilder {
  private userId: string | null = null;
  private mockServices: Partial<GraphQLContext['services']> = {};

  /**
   * Create a new ContextBuilder instance
   */
  static create(): ContextBuilder {
    return new ContextBuilder();
  }

  /**
   * Set the context as authenticated with a user ID
   *
   * @param userId - User ID (defaults to TEST_USER_ID)
   * @returns this for chaining
   */
  authenticated(userId: string = TEST_USER_ID): this {
    this.userId = userId;
    return this;
  }

  /**
   * Set the context as unauthenticated
   *
   * @returns this for chaining
   */
  unauthenticated(): this {
    this.userId = null;
    return this;
  }

  /**
   * Add mock services to the context
   *
   * @param services - Partial services object
   * @returns this for chaining
   */
  withServices(services: Partial<GraphQLContext['services']>): this {
    this.mockServices = { ...this.mockServices, ...services };
    return this;
  }

  /**
   * Build the GraphQL context with all configured settings
   *
   * @returns Complete GraphQL context
   */
  build(): GraphQLContext {
    // Create default mock services
    const mockProfileService = (this.mockServices.profileService ||
      this.createMockProfileService()) as ProfileService;

    const mockPostService = (this.mockServices.postService ||
      this.createMockPostService()) as PostService;

    const mockLikeService = (this.mockServices.likeService ||
      this.createMockLikeService()) as LikeService;

    const mockCommentService = (this.mockServices.commentService ||
      this.createMockCommentService()) as CommentService;

    const mockFollowService = (this.mockServices.followService ||
      this.createMockFollowService()) as FollowService;

    const mockFeedService = (this.mockServices.feedService ||
      this.createMockFeedService()) as FeedService;

    const mockNotificationService = (this.mockServices.notificationService ||
      this.createMockNotificationService()) as NotificationService;

    const mockAuthService = this.mockServices.authService || {
      register: vi.fn(),
      login: vi.fn(),
      refreshToken: vi.fn(),
      getUserById: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    };

    const mockAuctionService = (this.mockServices.auctionService ||
      this.createMockAuctionService()) as AuctionService;

    return {
      userId: this.userId,
      dynamoClient: {} as any,
      tableName: 'test-table',
      services: {
        profileService: mockProfileService,
        postService: mockPostService,
        likeService: mockLikeService,
        commentService: mockCommentService,
        followService: mockFollowService,
        feedService: mockFeedService,
        notificationService: mockNotificationService,
        authService: mockAuthService,
        auctionService: mockAuctionService,
        ...this.mockServices,
      },
      loaders: createLoaders(
        {
          profileService: mockProfileService,
          postService: mockPostService,
          likeService: mockLikeService,
          auctionService: mockAuctionService,
        },
        this.userId
      ),
    };
  }

  /**
   * Create a mock ProfileService with default stubs
   */
  private createMockProfileService() {
    return {
      getProfilesByIds: vi.fn(),
      getProfileByHandle: vi.fn(),
      updateProfile: vi.fn(),
    } as unknown as ProfileService;
  }

  /**
   * Create a mock PostService with default stubs
   */
  private createMockPostService() {
    return {
      getFeedPosts: vi.fn(),
      getFollowingFeedPosts: vi.fn(),
      getPostById: vi.fn(),
      getUserPosts: vi.fn(),
      createPost: vi.fn(),
      updatePost: vi.fn(),
      deletePost: vi.fn(),
    } as unknown as PostService;
  }

  /**
   * Create a mock LikeService with default stubs
   */
  private createMockLikeService() {
    return {
      getLikeStatusesByPostIds: vi.fn(),
      likePost: vi.fn(),
      unlikePost: vi.fn(),
    } as unknown as LikeService;
  }

  /**
   * Create a mock CommentService with default stubs
   */
  private createMockCommentService() {
    return {
      getCommentsByPostId: vi.fn(),
      createComment: vi.fn(),
      deleteComment: vi.fn(),
    } as unknown as CommentService;
  }

  /**
   * Create a mock FollowService with default stubs
   */
  private createMockFollowService() {
    return {
      getFollowingList: vi.fn(),
      followUser: vi.fn(),
      unfollowUser: vi.fn(),
    } as unknown as FollowService;
  }

  /**
   * Create a mock FeedService with default stubs
   */
  private createMockFeedService() {
    return {
      markPostsAsRead: vi.fn(),
    } as unknown as FeedService;
  }

  /**
   * Create a mock NotificationService with default stubs
   */
  private createMockNotificationService() {
    return {
      getNotifications: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    } as unknown as NotificationService;
  }

  /**
   * Create a mock AuctionService with default stubs
   */
  private createMockAuctionService() {
    return {
      listAuctions: vi.fn(),
      getAuctionById: vi.fn(),
      createAuction: vi.fn(),
      placeBid: vi.fn(),
    } as unknown as AuctionService;
  }
}

/**
 * Create a profile map for mocking getProfilesByIds
 * Uses shared fixtures for consistency
 *
 * @param configs - Array of profile configurations
 * @returns Map of user IDs to profile objects
 *
 * @example
 * ```typescript
 * const profiles = createTestProfileMap([
 *   { id: 'user-1', handle: 'user1', fullName: 'User One' },
 *   { id: 'user-2', handle: 'user2', fullName: 'User Two' },
 * ]);
 * vi.mocked(profileService.getProfilesByIds).mockResolvedValue(profiles);
 * ```
 */
export function createTestProfileMap(
  configs: Array<{ id: string; handle: string; fullName?: string }>
): Map<string, any> {
  return new Map(
    configs.map(({ id, handle, fullName }) => [
      id,
      {
        ...createMockPublicProfile({ id, handle, fullName }),
        username: handle, // Backend needs username field
        createdAt: new Date().toISOString(),
      },
    ])
  );
}

/**
 * Create standard two-user profile map (most common case)
 * Uses TEST_USERS constants for consistency
 *
 * @returns Map with user-1 and user-2 profiles
 *
 * @example
 * ```typescript
 * vi.mocked(profileService.getProfilesByIds).mockResolvedValue(createStandardProfileMap());
 * ```
 */
export function createStandardProfileMap(): Map<string, any> {
  return createTestProfileMap([
    { id: TEST_USERS.USER_1, handle: 'user1', fullName: 'User One' },
    { id: TEST_USERS.USER_2, handle: 'user2', fullName: 'User Two' },
  ]);
}
