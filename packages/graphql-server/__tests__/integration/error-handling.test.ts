/**
 * GraphQL Integration Tests - Error Handling
 *
 * Tests error scenarios through actual GraphQL execution.
 * Verifies proper GraphQL error formatting and error codes.
 *
 * Test Focus:
 * - Authentication errors (UNAUTHENTICATED)
 * - Authorization errors (FORBIDDEN/NOT_FOUND)
 * - Validation errors (BAD_REQUEST)
 * - GraphQL syntax errors
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApolloServer } from '@apollo/server';
import { createApolloServerWithPothos } from '../../src/server-with-pothos.js';
import { PostService, CommentService, ProfileService, LikeService, FollowService } from '@social-media-app/dal';
import { createLoaders } from '../../src/dataloaders/index.js';
import type { GraphQLContext } from '../../src/context.js';

describe('GraphQL Integration - Error Handling', () => {
  let server: ApolloServer<GraphQLContext>;
  let mockContext: GraphQLContext;
  let unauthContext: GraphQLContext;

  beforeEach(async () => {
    server = createApolloServerWithPothos();
    await server.start();

    // Create pure mock service objects (no real instantiation, no spies)
    // Only mock methods that resolvers actually call
    const mockProfileService = {
      getProfileByHandle: vi.fn(),
    } as unknown as ProfileService;

    const mockPostService = {
      updatePost: vi.fn(),
    } as unknown as PostService;

    const mockLikeService = {} as unknown as LikeService;

    const mockCommentService = {
      deleteComment: vi.fn(),
    } as unknown as CommentService;

    const mockFollowService = {} as unknown as FollowService;

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

  describe('Authentication Errors', () => {
    it('should return UNAUTHENTICATED error for mutations without auth', async () => {
      const result = await server.executeOperation({
        query: `
          mutation CreatePost($input: CreatePostInput!) {
            createPost(input: $input) {
              post { id }
              uploadUrl
            }
          }
        `,
        variables: {
          input: { fileType: 'image/jpeg', caption: 'Test' },
        },
      }, { contextValue: unauthContext });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.data).toBeNull();
        expect(result.body.singleResult.errors).toBeDefined();
        expect(result.body.singleResult.errors?.length).toBeGreaterThan(0);

        const error = result.body.singleResult.errors![0];
        expect(error.message).toMatch(/authenticated/i);
        expect(error.extensions?.code).toBe('UNAUTHENTICATED');
      }
    });

    it('should return UNAUTHENTICATED error for me query without auth', async () => {
      const result = await server.executeOperation({
        query: `
          query Me {
            me {
              id
              handle
            }
          }
        `,
      }, { contextValue: unauthContext });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.data).toBeNull();
        expect(result.body.singleResult.errors).toBeDefined();

        const error = result.body.singleResult.errors![0];
        expect(error.message).toMatch(/authenticated/i);
        expect(error.extensions?.code).toBe('UNAUTHENTICATED');
      }
    });

    it('should allow public queries without authentication', async () => {
      (mockContext.services.profileService.getProfileByHandle as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user-123',
        handle: 'publicuser',
        displayName: 'Public User',
        bio: null,
        profileImageUrl: null,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      const result = await server.executeOperation({
        query: `
          query GetProfile($handle: String!) {
            profile(handle: $handle) {
              handle
              displayName
            }
          }
        `,
        variables: { handle: 'publicuser' },
      }, { contextValue: unauthContext });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();
        expect(result.body.singleResult.data?.profile).toBeDefined();
      }
    });
  });

  describe('Authorization Errors', () => {
    it('should return NOT_FOUND when updating non-existent post', async () => {
      (mockContext.services.postService.updatePost as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await server.executeOperation({
        query: `
          mutation UpdatePost($id: ID!, $input: UpdatePostInput!) {
            updatePost(id: $id, input: $input) {
              id
              caption
            }
          }
        `,
        variables: {
          id: 'nonexistent-post',
          input: { caption: 'Updated' },
        },
      }, { contextValue: mockContext });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.data).toBeNull();
        expect(result.body.singleResult.errors).toBeDefined();

        const error = result.body.singleResult.errors![0];
        expect(error.message).toMatch(/not found|permission/i);
        expect(error.extensions?.code).toBe('NOT_FOUND');
      }
    });

    it('should return NOT_FOUND when deleting non-existent comment', async () => {
      (mockContext.services.commentService.deleteComment as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const result = await server.executeOperation({
        query: `
          mutation DeleteComment($id: ID!) {
            deleteComment(id: $id) {
              success
            }
          }
        `,
        variables: { id: 'nonexistent-comment' },
      }, { contextValue: mockContext });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.data).toBeNull();
        expect(result.body.singleResult.errors).toBeDefined();

        const error = result.body.singleResult.errors![0];
        expect(error.message).toMatch(/not found|permission/i);
        expect(error.extensions?.code).toBe('NOT_FOUND');
      }
    });

    it('should return BAD_REQUEST when trying to follow self', async () => {
      const result = await server.executeOperation({
        query: `
          mutation FollowUser($userId: ID!) {
            followUser(userId: $userId) {
              success
              isFollowing
            }
          }
        `,
        variables: { userId: 'test-user-123' }, // Same as context.userId
      }, { contextValue: mockContext });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.data).toBeNull();
        expect(result.body.singleResult.errors).toBeDefined();

        const error = result.body.singleResult.errors![0];
        expect(error.message).toMatch(/cannot follow (yourself|self)/i);
        expect(error.extensions?.code).toBe('BAD_REQUEST');
      }
    });
  });

  describe('Validation Errors', () => {
    it('should return validation error for invalid cursor format', async () => {
      (mockContext.services.profileService.getProfileByHandle as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user-123',
        handle: 'testuser',
        displayName: 'Test User',
        bio: null,
        profileImageUrl: null,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      const result = await server.executeOperation({
        query: `
          query GetUserPosts($handle: String!, $cursor: String) {
            userPosts(handle: $handle, cursor: $cursor) {
              edges {
                node { id }
              }
            }
          }
        `,
        variables: {
          handle: 'testuser',
          cursor: 'invalid-base64!!!', // Invalid cursor
        },
      }, { contextValue: mockContext });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.data).toBeNull();
        expect(result.body.singleResult.errors).toBeDefined();

        const error = result.body.singleResult.errors![0];
        expect(error.message).toMatch(/invalid cursor/i);
        expect(error.extensions?.code).toBe('BAD_REQUEST');
      }
    });

    it('should return validation error for missing required fields', async () => {
      const result = await server.executeOperation({
        query: `
          mutation CreateComment($input: CreateCommentInput!) {
            createComment(input: $input) {
              id
            }
          }
        `,
        variables: {
          input: {
            postId: 'post-123',
            // Missing required 'content' field
          },
        },
      }, { contextValue: mockContext });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeDefined();
        expect(result.body.singleResult.errors?.length).toBeGreaterThan(0);

        // GraphQL validation error (not from resolver)
        const error = result.body.singleResult.errors![0];
        expect(error.message).toBeDefined();
      }
    });

    it('should return validation error for non-existent fields', async () => {
      const result = await server.executeOperation({
        query: `
          query GetProfile($handle: String!) {
            profile(handle: $handle) {
              handle
              nonExistentField
            }
          }
        `,
        variables: { handle: 'testuser' },
      }, { contextValue: mockContext });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeDefined();
        expect(result.body.singleResult.errors?.length).toBeGreaterThan(0);

        // GraphQL validation error for field that doesn't exist in schema
        const error = result.body.singleResult.errors![0];
        expect(error.message).toMatch(/cannot query field/i);
      }
    });
  });
});
