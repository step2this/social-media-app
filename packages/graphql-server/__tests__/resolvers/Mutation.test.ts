/**
 * Mutation Resolver Tests
 *
 * Tests GraphQL Mutation resolvers by mocking DAL services (not DynamoDB).
 *
 * Test Focus (GraphQL concerns only):
 * - Authentication checks (userId required for mutations)
 * - Authorization checks (user owns resource for update/delete)
 * - GraphQL error codes (UNAUTHENTICATED, FORBIDDEN, BAD_REQUEST, NOT_FOUND)
 * - Input validation (GraphQL argument parsing)
 * - Response field mapping (DAL types → GraphQL types)
 * - Success/failure response formats
 *
 * NOT Tested Here (DAL already covers):
 * - DynamoDB operations
 * - Business logic validation
 * - Entity mapping
 * - Transaction handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GraphQLError } from 'graphql';
import { Mutation } from '../../src/schema/resolvers/Mutation.js';
import { PostService, CommentService, LikeService, FollowService, ProfileService } from '@social-media-app/dal';
import type { GraphQLContext } from '../../src/context.js';
import type {
  Post,
  CreatePostResponse,
  LikePostResponse,
  UnlikePostResponse,
  FollowUserResponse,
  UnfollowUserResponse,
  Comment,
} from '@social-media-app/shared';

describe('Mutation Resolvers', () => {
  let mockContext: GraphQLContext;

  beforeEach(() => {
    // Create mock service instances
    const mockProfileService = new ProfileService({} as any, 'test-table', 'test-bucket', 'test-domain', {} as any);
    const mockPostService = new PostService({} as any, 'test-table', mockProfileService);
    const mockLikeService = new LikeService({} as any, 'test-table');
    const mockCommentService = new CommentService({} as any, 'test-table');
    const mockFollowService = new FollowService({} as any, 'test-table');

    // Create minimal mock context
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

  describe('createPost', () => {
    it('should create post when authenticated', async () => {
      const mockResponse: CreatePostResponse = {
        post: {
          id: 'post-123',
          userId: 'test-user-123',
          userHandle: 'testuser',
          caption: 'New post',
          imageUrl: 'https://example.com/image.jpg',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          likesCount: 0,
          commentsCount: 0,
          tags: [],
          createdAt: '2024-01-01T00:00:00.000Z',
          isLiked: false,
        },
        uploadUrl: 'https://s3.example.com/upload-url',
        thumbnailUploadUrl: 'https://s3.example.com/thumbnail-upload-url',
      };

      vi.spyOn(PostService.prototype, 'createPost').mockResolvedValue(mockResponse);

      const result = await Mutation.createPost(
        {},
        { input: { fileType: 'image/jpeg', caption: 'New post' } },
        mockContext,
        {} as any
      );

      expect(result).toEqual(mockResponse);
      expect(result.post.id).toBe('post-123');
      expect(result.uploadUrl).toBeDefined();
      expect(result.thumbnailUploadUrl).toBeDefined();
    });

    it('should throw UNAUTHENTICATED when userId is null', async () => {
      const unauthContext: GraphQLContext = {
        ...mockContext,
        userId: null,
      };

      await expect(
        Mutation.createPost(
          {},
          { input: { fileType: 'image/jpeg', caption: 'New post' } },
          unauthContext,
          {} as any
        )
      ).rejects.toThrow(GraphQLError);

      try {
        await Mutation.createPost(
          {},
          { input: { fileType: 'image/jpeg', caption: 'New post' } },
          unauthContext,
          {} as any
        );
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });
  });

  describe('updatePost', () => {
    it('should update post when user is the owner', async () => {
      const mockPost: Post = {
        id: 'post-123',
        userId: 'test-user-123',
        userHandle: 'testuser',
        caption: 'Updated caption',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        likesCount: 5,
        commentsCount: 2,
        tags: ['updated'],
        createdAt: '2024-01-01T00:00:00.000Z',
        isLiked: false,
      };

      vi.spyOn(PostService.prototype, 'updatePost').mockResolvedValue(mockPost);

      const result = await Mutation.updatePost(
        {},
        { id: 'post-123', input: { caption: 'Updated caption' } },
        mockContext,
        {} as any
      );

      expect(result).toEqual(mockPost);
      expect(result?.caption).toBe('Updated caption');
    });

    it('should throw UNAUTHENTICATED when userId is null', async () => {
      const unauthContext: GraphQLContext = {
        ...mockContext,
        userId: null,
      };

      await expect(
        Mutation.updatePost(
          {},
          { id: 'post-123', input: { caption: 'Updated' } },
          unauthContext,
          {} as any
        )
      ).rejects.toThrow(GraphQLError);

      try {
        await Mutation.updatePost(
          {},
          { id: 'post-123', input: { caption: 'Updated' } },
          unauthContext,
          {} as any
        );
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });

    it('should throw NOT_FOUND when post does not exist', async () => {
      vi.spyOn(PostService.prototype, 'updatePost').mockResolvedValue(null);

      try {
        await Mutation.updatePost(
          {},
          { id: 'nonexistent', input: { caption: 'Updated' } },
          mockContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.message).toMatch(/not found/i);
          expect(error.extensions.code).toBe('NOT_FOUND');
        }
      }
    });
  });

  describe('deletePost', () => {
    it('should delete post when user is the owner', async () => {
      vi.spyOn(PostService.prototype, 'deletePost').mockResolvedValue(true);

      const result = await Mutation.deletePost(
        {},
        { id: 'post-123' },
        mockContext,
        {} as any
      );

      expect(result).toEqual({ success: true });
    });

    it('should throw UNAUTHENTICATED when userId is null', async () => {
      const unauthContext: GraphQLContext = {
        ...mockContext,
        userId: null,
      };

      await expect(
        Mutation.deletePost({}, { id: 'post-123' }, unauthContext, {} as any)
      ).rejects.toThrow(GraphQLError);

      try {
        await Mutation.deletePost({}, { id: 'post-123' }, unauthContext, {} as any);
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });

    it('should throw NOT_FOUND when post does not exist', async () => {
      vi.spyOn(PostService.prototype, 'deletePost').mockResolvedValue(false);

      try {
        await Mutation.deletePost({}, { id: 'nonexistent' }, mockContext, {} as any);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.message).toMatch(/not found|failed to delete/i);
          expect(error.extensions.code).toBe('NOT_FOUND');
        }
      }
    });
  });

  describe('likePost', () => {
    it('should like post when authenticated', async () => {
      const mockResponse: LikePostResponse = {
        success: true,
        likesCount: 6,
        isLiked: true,
      };

      vi.spyOn(LikeService.prototype, 'likePost').mockResolvedValue(mockResponse);

      const result = await Mutation.likePost(
        {},
        { postId: 'post-123' },
        mockContext,
        {} as any
      );

      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
      expect(result.isLiked).toBe(true);
      expect(result.likesCount).toBe(6);
    });

    it('should throw UNAUTHENTICATED when userId is null', async () => {
      const unauthContext: GraphQLContext = {
        ...mockContext,
        userId: null,
      };

      await expect(
        Mutation.likePost({}, { postId: 'post-123' }, unauthContext, {} as any)
      ).rejects.toThrow(GraphQLError);

      try {
        await Mutation.likePost({}, { postId: 'post-123' }, unauthContext, {} as any);
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });
  });

  describe('unlikePost', () => {
    it('should unlike post when authenticated', async () => {
      const mockResponse: UnlikePostResponse = {
        success: true,
        likesCount: 5,
        isLiked: false,
      };

      vi.spyOn(LikeService.prototype, 'unlikePost').mockResolvedValue(mockResponse);

      const result = await Mutation.unlikePost(
        {},
        { postId: 'post-123' },
        mockContext,
        {} as any
      );

      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
      expect(result.isLiked).toBe(false);
      expect(result.likesCount).toBe(5);
    });

    it('should throw UNAUTHENTICATED when userId is null', async () => {
      const unauthContext: GraphQLContext = {
        ...mockContext,
        userId: null,
      };

      await expect(
        Mutation.unlikePost({}, { postId: 'post-123' }, unauthContext, {} as any)
      ).rejects.toThrow(GraphQLError);

      try {
        await Mutation.unlikePost({}, { postId: 'post-123' }, unauthContext, {} as any);
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });
  });

  describe('followUser', () => {
    it('should follow user when authenticated', async () => {
      const mockResponse: FollowUserResponse = {
        success: true,
        followersCount: 101,
        followingCount: 51,
        isFollowing: true,
      };

      vi.spyOn(FollowService.prototype, 'followUser').mockResolvedValue(mockResponse);

      const result = await Mutation.followUser(
        {},
        { userId: 'user-456' },
        mockContext,
        {} as any
      );

      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
      expect(result.isFollowing).toBe(true);
    });

    it('should throw UNAUTHENTICATED when userId is null', async () => {
      const unauthContext: GraphQLContext = {
        ...mockContext,
        userId: null,
      };

      await expect(
        Mutation.followUser({}, { userId: 'user-456' }, unauthContext, {} as any)
      ).rejects.toThrow(GraphQLError);

      try {
        await Mutation.followUser({}, { userId: 'user-456' }, unauthContext, {} as any);
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });

    it('should throw BAD_REQUEST when trying to follow self', async () => {
      try {
        await Mutation.followUser(
          {},
          { userId: 'test-user-123' }, // Same as context.userId
          mockContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.message).toMatch(/cannot follow (yourself|self)/i);
          expect(error.extensions.code).toBe('BAD_REQUEST');
        }
      }
    });
  });

  describe('unfollowUser', () => {
    it('should unfollow user when authenticated', async () => {
      const mockResponse: UnfollowUserResponse = {
        success: true,
        followersCount: 100,
        followingCount: 50,
        isFollowing: false,
      };

      vi.spyOn(FollowService.prototype, 'unfollowUser').mockResolvedValue(mockResponse);

      const result = await Mutation.unfollowUser(
        {},
        { userId: 'user-456' },
        mockContext,
        {} as any
      );

      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
      expect(result.isFollowing).toBe(false);
    });

    it('should throw UNAUTHENTICATED when userId is null', async () => {
      const unauthContext: GraphQLContext = {
        ...mockContext,
        userId: null,
      };

      await expect(
        Mutation.unfollowUser({}, { userId: 'user-456' }, unauthContext, {} as any)
      ).rejects.toThrow(GraphQLError);

      try {
        await Mutation.unfollowUser({}, { userId: 'user-456' }, unauthContext, {} as any);
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });
  });

  describe('createComment', () => {
    it('should create comment when authenticated', async () => {
      const mockComment: Comment = {
        id: 'comment-123',
        postId: 'post-123',
        userId: 'test-user-123',
        userHandle: 'testuser',
        content: 'Great post!',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      vi.spyOn(CommentService.prototype, 'createComment').mockResolvedValue(mockComment);

      const result = await Mutation.createComment(
        {},
        { input: { postId: 'post-123', content: 'Great post!' } },
        mockContext,
        {} as any
      );

      expect(result).toEqual(mockComment);
      expect(result.content).toBe('Great post!');
      expect(result.userId).toBe('test-user-123');
    });

    it('should throw UNAUTHENTICATED when userId is null', async () => {
      const unauthContext: GraphQLContext = {
        ...mockContext,
        userId: null,
      };

      await expect(
        Mutation.createComment(
          {},
          { input: { postId: 'post-123', content: 'Great post!' } },
          unauthContext,
          {} as any
        )
      ).rejects.toThrow(GraphQLError);

      try {
        await Mutation.createComment(
          {},
          { input: { postId: 'post-123', content: 'Great post!' } },
          unauthContext,
          {} as any
        );
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });
  });

  describe('deleteComment', () => {
    it('should delete comment when user is the owner', async () => {
      vi.spyOn(CommentService.prototype, 'deleteComment').mockResolvedValue(true);

      const result = await Mutation.deleteComment(
        {},
        { id: 'comment-123' },
        mockContext,
        {} as any
      );

      expect(result).toEqual({ success: true });
    });

    it('should throw UNAUTHENTICATED when userId is null', async () => {
      const unauthContext: GraphQLContext = {
        ...mockContext,
        userId: null,
      };

      await expect(
        Mutation.deleteComment({}, { id: 'comment-123' }, unauthContext, {} as any)
      ).rejects.toThrow(GraphQLError);

      try {
        await Mutation.deleteComment({}, { id: 'comment-123' }, unauthContext, {} as any);
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });

    it('should throw NOT_FOUND when comment does not exist', async () => {
      vi.spyOn(CommentService.prototype, 'deleteComment').mockResolvedValue(false);

      try {
        await Mutation.deleteComment({}, { id: 'nonexistent' }, mockContext, {} as any);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.message).toMatch(/not found|failed to delete/i);
          expect(error.extensions.code).toBe('NOT_FOUND');
        }
      }
    });
  });
});
