/**
 * GraphQL Integration Tests - Field Resolution
 *
 * Tests nested field resolution through actual GraphQL execution.
 * Verifies that field resolvers work correctly in real queries.
 *
 * Test Focus:
 * - Multi-hop field resolution (Post → author → profile data)
 * - Authentication-dependent fields (isLiked, isFollowing)
 * - Null handling for unauthenticated users
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApolloServer } from '@apollo/server';
import { createApolloServerWithPothos } from '../../src/server-with-pothos.js';
import { PostService, ProfileService, LikeService, FollowService, CommentService } from '@social-media-app/dal';
import { createLoaders } from '../../src/dataloaders/index.js';
import type { GraphQLContext } from '../../src/context.js';
import type { Post, PublicProfile } from '@social-media-app/shared';

describe('GraphQL Integration - Field Resolution', () => {
  let server: ApolloServer<GraphQLContext>;
  let mockContext: GraphQLContext;
  let unauthContext: GraphQLContext;
  let mockProfileService: ProfileService;
  let mockPostService: PostService;
  let mockLikeService: LikeService;

  beforeEach(async () => {
    server = createApolloServerWithPothos();
    await server.start();

    // Create pure mock service objects (no real instantiation, no spies)
    // Only mock methods that resolvers/loaders actually call
    mockProfileService = {
      getProfilesByIds: vi.fn(),
      getProfileByHandle: vi.fn(),
    } as unknown as ProfileService;

    mockPostService = {
      getPostById: vi.fn(),
    } as unknown as PostService;

    mockLikeService = {
      getLikeStatusesByPostIds: vi.fn(),
    } as unknown as LikeService;

    const mockCommentService = {} as unknown as CommentService;
    const mockFollowService = {
      getFollowStatus: vi.fn(),
    } as unknown as FollowService;

    mockContext = {
      userId: 'test-user-123',
      dynamoClient: {} as any,
      tableName: 'test-table',
      services: {
        profileService: mockProfileService,
        postService: mockPostService,
        likeService: mockLikeService,
        commentService: mockCommentService,
        followService: mockFollowService,
        feedService: {} as any,
        notificationService: {} as any,
        authService: {} as any,
        auctionService: {} as any,
      },
      loaders: createLoaders({
        profileService: mockProfileService,
        postService: mockPostService,
        likeService: mockLikeService,
        auctionService: {} as any,
      }, 'test-user-123'),
    };

    unauthContext = {
      userId: null,
      dynamoClient: {} as any,
      tableName: 'test-table',
      services: {
        profileService: mockProfileService,
        postService: mockPostService,
        likeService: mockLikeService,
        commentService: mockCommentService,
        followService: mockFollowService,
        feedService: {} as any,
        notificationService: {} as any,
        authService: {} as any,
        auctionService: {} as any,
      },
      loaders: createLoaders({
        profileService: mockProfileService,
        postService: mockPostService,
        likeService: mockLikeService,
        auctionService: {} as any,
      }, null),
    };

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await server.stop();
    vi.restoreAllMocks();
  });

  describe('Post Field Resolution', () => {
    it('should resolve Post.author and Post.isLiked in single query (authenticated)', async () => {
      const mockPost: Post = {
        id: 'post-123',
        userId: 'author-456',
        userHandle: 'authoruser',
        caption: 'Test post',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        likesCount: 5,
        commentsCount: 2,
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        isLiked: false,
      };

      const mockAuthor: PublicProfile = {
        id: 'author-456',
        handle: 'authoruser',
        displayName: 'Author User',
        bio: 'Content creator',
        profileImageUrl: 'https://example.com/avatar.jpg',
        followersCount: 100,
        followingCount: 50,
        postsCount: 25,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      (mockPostService.getPostById as ReturnType<typeof vi.fn>).mockResolvedValue(mockPost);
      // Mock batch methods used by DataLoaders
      (mockProfileService.getProfilesByIds as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Map([['author-456', mockAuthor]])
      );
      (mockLikeService.getLikeStatusesByPostIds as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Map([['post-123', { isLiked: true, likesCount: 5 }]])
      );

      const result = await server.executeOperation({
        query: `
          query GetPostWithDetails($id: ID!) {
            post(id: $id) {
              id
              caption
              likesCount
              isLiked
              author {
                id
                handle
                displayName
                bio
                followersCount
              }
            }
          }
        `,
        variables: { id: 'post-123' },
      }, { contextValue: mockContext });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();

        const post = result.body.singleResult.data?.post;
        expect(post.id).toBe('post-123');
        expect(post.isLiked).toBe(true);
        expect(post.author.handle).toBe('authoruser');
        expect(post.author.displayName).toBe('Author User');
        expect(post.author.bio).toBe('Content creator');
        expect(post.author.followersCount).toBe(100);
      }

      // Verify batch methods were called by DataLoaders
      expect(mockProfileService.getProfilesByIds).toHaveBeenCalled();
      expect(mockLikeService.getLikeStatusesByPostIds).toHaveBeenCalled();
    });

    it('should resolve Post.author but return null for Post.isLiked (unauthenticated)', async () => {
      const mockPost: Post = {
        id: 'post-123',
        userId: 'author-456',
        userHandle: 'authoruser',
        caption: 'Test post',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        likesCount: 5,
        commentsCount: 2,
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        isLiked: false,
      };

      const mockAuthor: PublicProfile = {
        id: 'author-456',
        handle: 'authoruser',
        displayName: 'Author User',
        bio: null,
        profileImageUrl: null,
        followersCount: 100,
        followingCount: 50,
        postsCount: 25,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      (mockPostService.getPostById as ReturnType<typeof vi.fn>).mockResolvedValue(mockPost);
      // Mock batch method used by DataLoader
      (mockProfileService.getProfilesByIds as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Map([['author-456', mockAuthor]])
      );
      const likeServiceSpy = (mockLikeService.getLikeStatusesByPostIds as ReturnType<typeof vi.fn>);

      const result = await server.executeOperation({
        query: `
          query GetPostWithDetails($id: ID!) {
            post(id: $id) {
              id
              caption
              isLiked
              author {
                handle
              }
            }
          }
        `,
        variables: { id: 'post-123' },
      }, { contextValue: unauthContext });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();

        const post = result.body.singleResult.data?.post;
        expect(post.isLiked).toBeNull(); // Unauthenticated users get null
        expect(post.author.handle).toBe('authoruser'); // But author still resolves
      }

      // Verify LikeService was NOT called for unauthenticated user
      expect(likeServiceSpy).not.toHaveBeenCalled();
    });
  });

  describe('Profile Field Resolution', () => {
    it('should resolve Profile.isFollowing when authenticated', async () => {
      const mockProfile: PublicProfile = {
        id: 'user-456',
        handle: 'targetuser',
        displayName: 'Target User',
        bio: 'Bio text',
        profileImageUrl: null,
        followersCount: 100,
        followingCount: 50,
        postsCount: 25,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      (mockProfileService.getProfileByHandle as ReturnType<typeof vi.fn>).mockResolvedValue(mockProfile);
      (mockContext.services.followService.getFollowStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        isFollowing: true,
        followersCount: 100,
        followingCount: 50,
      });

      const result = await server.executeOperation({
        query: `
          query GetProfile($handle: String!) {
            profile(handle: $handle) {
              id
              handle
              followersCount
              isFollowing
            }
          }
        `,
        variables: { handle: 'targetuser' },
      }, { contextValue: mockContext });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();

        const profile = result.body.singleResult.data?.profile;
        expect(profile.isFollowing).toBe(true);
      }

      // Verify field resolver was called
      expect(mockContext.services.followService.getFollowStatus).toHaveBeenCalledWith('test-user-123', 'user-456');
    });

    it('should return null for Profile.isFollowing when viewing own profile', async () => {
      const mockProfile: PublicProfile = {
        id: 'test-user-123', // Same as context.userId
        handle: 'testuser',
        displayName: 'Test User',
        bio: null,
        profileImageUrl: null,
        followersCount: 10,
        followingCount: 5,
        postsCount: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      (mockProfileService.getProfileByHandle as ReturnType<typeof vi.fn>).mockResolvedValue(mockProfile);
      const followServiceSpy = (mockContext.services.followService.getFollowStatus as ReturnType<typeof vi.fn>);

      const result = await server.executeOperation({
        query: `
          query GetProfile($handle: String!) {
            profile(handle: $handle) {
              id
              handle
              isFollowing
            }
          }
        `,
        variables: { handle: 'testuser' },
      }, { contextValue: mockContext });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();

        const profile = result.body.singleResult.data?.profile;
        expect(profile.isFollowing).toBeNull(); // Can't follow yourself
      }

      // Verify FollowService was NOT called
      expect(followServiceSpy).not.toHaveBeenCalled();
    });

    it('should return null for Profile.isFollowing when unauthenticated', async () => {
      const mockProfile: PublicProfile = {
        id: 'user-456',
        handle: 'targetuser',
        displayName: 'Target User',
        bio: null,
        profileImageUrl: null,
        followersCount: 100,
        followingCount: 50,
        postsCount: 25,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      (mockProfileService.getProfileByHandle as ReturnType<typeof vi.fn>).mockResolvedValue(mockProfile);
      const followServiceSpy = (mockContext.services.followService.getFollowStatus as ReturnType<typeof vi.fn>);

      const result = await server.executeOperation({
        query: `
          query GetProfile($handle: String!) {
            profile(handle: $handle) {
              id
              handle
              isFollowing
            }
          }
        `,
        variables: { handle: 'targetuser' },
      }, { contextValue: unauthContext });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();

        const profile = result.body.singleResult.data?.profile;
        expect(profile.isFollowing).toBeNull(); // Unauthenticated users get null
      }

      // Verify FollowService was NOT called
      expect(followServiceSpy).not.toHaveBeenCalled();
    });
  });
});
