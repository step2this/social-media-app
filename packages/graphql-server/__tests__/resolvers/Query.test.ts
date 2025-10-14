/**
 * Query Resolver Tests
 *
 * Tests GraphQL Query resolvers by mocking DAL services (not DynamoDB).
 *
 * Test Focus (GraphQL concerns only):
 * - Authentication checks (userId required/optional)
 * - GraphQL error codes (UNAUTHENTICATED, NOT_FOUND, BAD_REQUEST)
 * - Argument parsing (handle, id, limit, cursor)
 * - Response field mapping (DAL types → GraphQL types)
 * - Pagination format (Relay connections: edges, pageInfo, cursor encoding)
 * - Null handling (return null vs throw error)
 *
 * NOT Tested Here (DAL already covers):
 * - DynamoDB query structure
 * - Data fetching logic
 * - Entity mapping
 * - Database error handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GraphQLError } from 'graphql';
import { Query } from '../../src/schema/resolvers/Query.js';
import { ProfileService, PostService, LikeService, CommentService, FollowService } from '@social-media-app/dal';
import type { GraphQLContext } from '../../src/context.js';
import type { Profile, PublicProfile, Post } from '@social-media-app/shared';

describe('Query Resolvers', () => {
  let mockContext: GraphQLContext;

  beforeEach(() => {
    // Create mock service instances
    const mockProfileService = new ProfileService({} as any, 'test-table', 'test-bucket', 'test-domain', {} as any);
    const mockPostService = new PostService({} as any, 'test-table', mockProfileService);
    const mockLikeService = new LikeService({} as any, 'test-table');
    const mockCommentService = new CommentService({} as any, 'test-table');
    const mockFollowService = new FollowService({} as any, 'test-table');

    // Create minimal mock context (no DynamoDB mocking needed)
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
      },
      loaders: {} as any,
    };

    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('me', () => {
    it('should return current user profile when authenticated', async () => {
      // Mock ProfileService to return a profile
      const mockProfile: Profile = {
        id: 'test-user-123',
        handle: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        bio: null,
        profileImageUrl: null,
        followersCount: 10,
        followingCount: 5,
        postsCount: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      vi.spyOn(ProfileService.prototype, 'getProfileById').mockResolvedValue(mockProfile);

      const result = await Query.me({}, {}, mockContext, {} as any);

      expect(result).toEqual(mockProfile);
      expect(result.id).toBe('test-user-123');
      expect(result.email).toBe('test@example.com'); // Full profile includes email
    });

    it('should throw UNAUTHENTICATED error when userId is null', async () => {
      const unauthContext: GraphQLContext = {
        ...mockContext,
        userId: null,
      };

      await expect(Query.me({}, {}, unauthContext, {} as any)).rejects.toThrow(
        GraphQLError
      );

      await expect(Query.me({}, {}, unauthContext, {} as any)).rejects.toThrow(
        /must be authenticated/i
      );

      // Verify error has proper GraphQL error code
      try {
        await Query.me({}, {}, unauthContext, {} as any);
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });

    it('should throw NOT_FOUND error when profile does not exist', async () => {
      vi.spyOn(ProfileService.prototype, 'getProfileById').mockResolvedValue(null);

      try {
        await Query.me({}, {}, mockContext, {} as any);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.message).toMatch(/profile not found/i);
          expect(error.extensions.code).toBe('NOT_FOUND');
        }
      }
    });
  });

  describe('profile', () => {
    it('should return public profile by handle', async () => {
      const mockPublicProfile: PublicProfile = {
        id: 'user-456',
        handle: 'johndoe',
        displayName: 'John Doe',
        bio: 'Software engineer',
        profileImageUrl: 'https://example.com/profile.jpg',
        followersCount: 100,
        followingCount: 50,
        postsCount: 25,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      vi.spyOn(ProfileService.prototype, 'getProfileByHandle').mockResolvedValue(
        mockPublicProfile
      );

      const result = await Query.profile(
        {},
        { handle: 'johndoe' },
        mockContext,
        {} as any
      );

      expect(result).toEqual(mockPublicProfile);
      expect(result?.handle).toBe('johndoe');
      expect(result?.id).toBe('user-456');
      // Public profile does NOT include email
      expect('email' in result!).toBe(false);
    });

    it('should return null when profile not found (not an error)', async () => {
      vi.spyOn(ProfileService.prototype, 'getProfileByHandle').mockResolvedValue(null);

      const result = await Query.profile(
        {},
        { handle: 'nonexistent' },
        mockContext,
        {} as any
      );

      expect(result).toBeNull();
    });

    it('should work without authentication', async () => {
      const unauthContext: GraphQLContext = {
        ...mockContext,
        userId: null,
      };

      const mockPublicProfile: PublicProfile = {
        id: 'user-789',
        handle: 'publicuser',
        displayName: 'Public User',
        bio: null,
        profileImageUrl: null,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      vi.spyOn(ProfileService.prototype, 'getProfileByHandle').mockResolvedValue(
        mockPublicProfile
      );

      const result = await Query.profile(
        {},
        { handle: 'publicuser' },
        unauthContext,
        {} as any
      );

      expect(result).toEqual(mockPublicProfile);
      expect(result?.handle).toBe('publicuser');
    });
  });

  describe('post', () => {
    it('should return post by id', async () => {
      const mockPost: Post = {
        id: 'post-123',
        userId: 'user-123',
        userHandle: 'testuser',
        caption: 'Test post',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        likesCount: 5,
        commentsCount: 2,
        tags: ['test', 'demo'],
        createdAt: '2024-01-01T00:00:00.000Z',
        isLiked: false,
      };

      vi.spyOn(PostService.prototype, 'getPostById').mockResolvedValue(mockPost);

      const result = await Query.post({}, { id: 'post-123' }, mockContext, {} as any);

      expect(result).toEqual(mockPost);
      expect(result?.id).toBe('post-123');
      expect(result?.caption).toBe('Test post');
      expect(result?.likesCount).toBe(5);
    });

    it('should return null when post not found (not an error)', async () => {
      vi.spyOn(PostService.prototype, 'getPostById').mockResolvedValue(null);

      const result = await Query.post(
        {},
        { id: 'nonexistent' },
        mockContext,
        {} as any
      );

      expect(result).toBeNull();
    });

    it('should work without authentication', async () => {
      const unauthContext: GraphQLContext = {
        ...mockContext,
        userId: null,
      };

      const mockPost: Post = {
        id: 'post-456',
        userId: 'user-456',
        userHandle: 'publicuser',
        caption: 'Public post',
        imageUrl: 'https://example.com/public.jpg',
        thumbnailUrl: 'https://example.com/public-thumb.jpg',
        likesCount: 0,
        commentsCount: 0,
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        isLiked: false,
      };

      vi.spyOn(PostService.prototype, 'getPostById').mockResolvedValue(mockPost);

      const result = await Query.post(
        {},
        { id: 'post-456' },
        unauthContext,
        {} as any
      );

      expect(result).toEqual(mockPost);
    });
  });

  describe('userPosts', () => {
    it('should return paginated posts with proper connection format', async () => {
      // Mock profile lookup
      const mockProfile: PublicProfile = {
        id: 'user-123',
        handle: 'testuser',
        displayName: 'Test User',
        bio: null,
        profileImageUrl: null,
        followersCount: 0,
        followingCount: 0,
        postsCount: 2,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      vi.spyOn(ProfileService.prototype, 'getProfileByHandle').mockResolvedValue(
        mockProfile
      );

      // Mock posts query
      const mockPosts: Post[] = [
        {
          id: 'post-1',
          userId: 'user-123',
          userHandle: 'testuser',
          caption: 'First post',
          imageUrl: 'https://example.com/1.jpg',
          thumbnailUrl: 'https://example.com/1-thumb.jpg',
          likesCount: 5,
          commentsCount: 2,
          tags: [],
          createdAt: '2024-01-01T00:00:00.000Z',
          isLiked: false,
        },
        {
          id: 'post-2',
          userId: 'user-123',
          userHandle: 'testuser',
          caption: 'Second post',
          imageUrl: 'https://example.com/2.jpg',
          thumbnailUrl: 'https://example.com/2-thumb.jpg',
          likesCount: 10,
          commentsCount: 5,
          tags: ['test'],
          createdAt: '2024-01-02T00:00:00.000Z',
          isLiked: false,
        },
      ];

      vi.spyOn(PostService.prototype, 'getUserPosts').mockResolvedValue({
        posts: mockPosts,
        hasMore: true,
        nextCursor: 'next-page-cursor',
      });

      const result = await Query.userPosts(
        {},
        { handle: 'testuser', limit: 2 },
        mockContext,
        {} as any
      );

      // Test Relay connection format
      expect(result).toBeDefined();
      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].node).toEqual(mockPosts[0]);
      expect(result.edges[1].node).toEqual(mockPosts[1]);

      // Test pagination info
      expect(result.pageInfo.hasNextPage).toBe(true);
      expect(result.pageInfo.endCursor).toBeDefined();

      // Test cursor encoding (base64 JSON)
      const decodedCursor = JSON.parse(
        Buffer.from(result.edges[0].cursor, 'base64').toString('utf-8')
      );
      expect(decodedCursor).toHaveProperty('PK');
      expect(decodedCursor).toHaveProperty('SK');
      expect(decodedCursor.PK).toBe('USER#user-123');
    });

    it('should return empty list when user has no posts', async () => {
      const mockProfile: PublicProfile = {
        id: 'user-123',
        handle: 'testuser',
        displayName: 'Test User',
        bio: null,
        profileImageUrl: null,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      vi.spyOn(ProfileService.prototype, 'getProfileByHandle').mockResolvedValue(
        mockProfile
      );

      vi.spyOn(PostService.prototype, 'getUserPosts').mockResolvedValue({
        posts: [],
        hasMore: false,
        nextCursor: undefined,
      });

      const result = await Query.userPosts(
        {},
        { handle: 'testuser' },
        mockContext,
        {} as any
      );

      expect(result.edges).toHaveLength(0);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.endCursor).toBeNull();
    });

    it('should throw NOT_FOUND error when user does not exist', async () => {
      vi.spyOn(ProfileService.prototype, 'getProfileByHandle').mockResolvedValue(null);

      try {
        await Query.userPosts({}, { handle: 'nonexistent' }, mockContext, {} as any);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.message).toMatch(/user not found/i);
          expect(error.extensions.code).toBe('NOT_FOUND');
        }
      }
    });

    it('should handle cursor-based pagination', async () => {
      const mockProfile: PublicProfile = {
        id: 'user-123',
        handle: 'testuser',
        displayName: 'Test User',
        bio: null,
        profileImageUrl: null,
        followersCount: 0,
        followingCount: 0,
        postsCount: 10,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      vi.spyOn(ProfileService.prototype, 'getProfileByHandle').mockResolvedValue(
        mockProfile
      );

      // Create a cursor (base64-encoded DynamoDB key)
      const cursor = Buffer.from(
        JSON.stringify({
          PK: 'USER#user-123',
          SK: 'POST#2024-01-01T00:00:00.000Z#post-1',
        })
      ).toString('base64');

      const mockPost: Post = {
        id: 'post-2',
        userId: 'user-123',
        userHandle: 'testuser',
        caption: 'Second page post',
        imageUrl: 'https://example.com/2.jpg',
        thumbnailUrl: 'https://example.com/2-thumb.jpg',
        likesCount: 10,
        commentsCount: 5,
        tags: [],
        createdAt: '2024-01-02T00:00:00.000Z',
        isLiked: false,
      };

      // Mock getUserPosts to verify cursor is decoded and passed
      const getUserPostsSpy = vi
        .spyOn(PostService.prototype, 'getUserPosts')
        .mockResolvedValue({
          posts: [mockPost],
          hasMore: false,
          nextCursor: undefined,
        });

      const result = await Query.userPosts(
        {},
        { handle: 'testuser', cursor },
        mockContext,
        {} as any
      );

      // Verify cursor was passed as-is (base64 string) to service
      expect(getUserPostsSpy).toHaveBeenCalledWith(
        'user-123',  // userId
        10,          // limit
        cursor       // cursor as base64 string
      );

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node.id).toBe('post-2');
    });

    it('should throw BAD_REQUEST error for invalid cursor', async () => {
      const mockProfile: PublicProfile = {
        id: 'user-123',
        handle: 'testuser',
        displayName: 'Test User',
        bio: null,
        profileImageUrl: null,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      vi.spyOn(ProfileService.prototype, 'getProfileByHandle').mockResolvedValue(
        mockProfile
      );

      // Invalid base64 cursor
      const invalidCursor = 'not-valid-base64!!!';

      try {
        await Query.userPosts(
          {},
          { handle: 'testuser', cursor: invalidCursor },
          mockContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.message).toMatch(/invalid cursor/i);
          expect(error.extensions.code).toBe('BAD_REQUEST');
        }
      }
    });

    it('should default to limit 10 when not specified', async () => {
      const mockProfile: PublicProfile = {
        id: 'user-123',
        handle: 'testuser',
        displayName: 'Test User',
        bio: null,
        profileImageUrl: null,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      vi.spyOn(ProfileService.prototype, 'getProfileByHandle').mockResolvedValue(
        mockProfile
      );

      const getUserPostsSpy = vi
        .spyOn(PostService.prototype, 'getUserPosts')
        .mockResolvedValue({
          posts: [],
          hasMore: false,
          nextCursor: undefined,
        });

      await Query.userPosts({}, { handle: 'testuser' }, mockContext, {} as any);

      // Verify default limit is 10
      expect(getUserPostsSpy).toHaveBeenCalledWith(
        'user-123',  // userId
        10,          // limit
        undefined    // cursor
      );
    });
  });
});
