/**
 * CommentAdapter Tests (TDD RED)
 *
 * Tests for the CommentAdapter that bridges DAL services and GraphQL types.
 * This adapter:
 * 1. Calls DAL comment service methods
 * 2. Transforms domain types to GraphQL types using TypeMapper
 * 3. Handles errors gracefully
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommentAdapter } from '../CommentAdapter';
import type { Comment as DomainComment, CommentsListResponse } from '@social-media-app/shared';
import { GraphQLError } from 'graphql';

describe('CommentAdapter', () => {
  let adapter: CommentAdapter;
  let mockCommentService: {
    getCommentsByPost: ReturnType<typeof vi.fn>;
    createComment: ReturnType<typeof vi.fn>;
    deleteComment: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Create mock methods
    mockCommentService = {
      getCommentsByPost: vi.fn(),
      createComment: vi.fn(),
      deleteComment: vi.fn(),
    };

    // Create adapter with mock service
    adapter = new CommentAdapter(mockCommentService as any);
    vi.clearAllMocks();
  });

  describe('getCommentsByPostId', () => {
    it('fetches comments and transforms to GraphQL types', async () => {
      // Arrange: Mock domain comments from DAL
      const domainComments: DomainComment[] = [
        {
          id: 'comment-1',
          postId: 'post-1',
          userId: 'user-1',
          userHandle: 'alice',
          content: 'First comment',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'comment-2',
          postId: 'post-1',
          userId: 'user-2',
          userHandle: 'bob',
          content: 'Second comment',
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ];

      const dalResponse: CommentsListResponse = {
        comments: domainComments,
        totalCount: 2,
        hasMore: false,
        nextCursor: undefined,
      };

      mockCommentService.getCommentsByPost.mockResolvedValue(dalResponse);

      // Act: Call adapter
      const result = await adapter.getCommentsByPostId({
        postId: 'post-1',
        first: 10,
      });

      // Assert: Verify GraphQL Connection structure
      expect(result.edges).toHaveLength(2);
      
      // Verify first edge
      expect(result.edges[0].node.id).toBe('comment-1');
      expect(result.edges[0].node.content).toBe('First comment');
      expect(result.edges[0].node.author).toBeDefined();
      expect(result.edges[0].node.author.id).toBe('user-1');
      expect(result.edges[0].node.author.handle).toBe('alice');
      expect(result.edges[0].cursor).toBeDefined();
      
      // Verify second edge
      expect(result.edges[1].node.id).toBe('comment-2');
      expect(result.edges[1].node.content).toBe('Second comment');
      expect(result.edges[1].node.author.handle).toBe('bob');
      
      // Verify pageInfo
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
      expect(result.pageInfo.startCursor).toBeDefined();
      expect(result.pageInfo.endCursor).toBeDefined();

      // Verify service was called correctly
      expect(mockCommentService.getCommentsByPost).toHaveBeenCalledWith(
        'post-1',
        10,
        undefined
      );
    });

    it('handles pagination correctly with cursor', async () => {
      // Arrange
      const domainComments: DomainComment[] = [
        {
          id: 'comment-3',
          postId: 'post-1',
          userId: 'user-3',
          userHandle: 'charlie',
          content: 'Third comment',
          createdAt: '2024-01-03T00:00:00Z',
          updatedAt: '2024-01-03T00:00:00Z',
        },
      ];

      const dalResponse: CommentsListResponse = {
        comments: domainComments,
        totalCount: 10,
        hasMore: true,
        nextCursor: 'cursor-abc-def',
      };

      mockCommentService.getCommentsByPost.mockResolvedValue(dalResponse);

      // Act
      const result = await adapter.getCommentsByPostId({
        postId: 'post-1',
        first: 1,
        after: 'cursor-prev-123',
      });

      // Assert
      expect(result.pageInfo.hasNextPage).toBe(true);
      expect(result.pageInfo.endCursor).toBeDefined();
      expect(result.edges).toHaveLength(1);
      
      // Verify cursor was passed to service
      expect(mockCommentService.getCommentsByPost).toHaveBeenCalledWith(
        'post-1',
        1,
        'cursor-prev-123'
      );
    });

    it('handles empty results', async () => {
      // Arrange
      const dalResponse: CommentsListResponse = {
        comments: [],
        totalCount: 0,
        hasMore: false,
        nextCursor: undefined,
      };

      mockCommentService.getCommentsByPost.mockResolvedValue(dalResponse);

      // Act
      const result = await adapter.getCommentsByPostId({
        postId: 'post-1',
        first: 10,
      });

      // Assert
      expect(result.edges).toHaveLength(0);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
      expect(result.pageInfo.startCursor).toBeNull();
      expect(result.pageInfo.endCursor).toBeNull();
    });

    it('throws GraphQLError on service error', async () => {
      // Arrange
      mockCommentService.getCommentsByPost.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act & Assert
      await expect(
        adapter.getCommentsByPostId({ postId: 'post-1', first: 10 })
      ).rejects.toThrow(GraphQLError);

      await expect(
        adapter.getCommentsByPostId({ postId: 'post-1', first: 10 })
      ).rejects.toThrow('Database connection failed');
    });

    it('validates postId parameter', async () => {
      // Act & Assert
      await expect(
        adapter.getCommentsByPostId({ postId: '', first: 10 })
      ).rejects.toThrow('postId is required');
    });

    it('validates first parameter bounds', async () => {
      // Act & Assert: Too small
      await expect(
        adapter.getCommentsByPostId({ postId: 'post-1', first: 0 })
      ).rejects.toThrow('first must be between 1 and 100');

      // Act & Assert: Too large
      await expect(
        adapter.getCommentsByPostId({ postId: 'post-1', first: 101 })
      ).rejects.toThrow('first must be between 1 and 100');
    });

    it('applies default value for first parameter', async () => {
      // Arrange
      const dalResponse: CommentsListResponse = {
        comments: [],
        totalCount: 0,
        hasMore: false,
        nextCursor: undefined,
      };

      mockCommentService.getCommentsByPost.mockResolvedValue(dalResponse);

      // Act
      await adapter.getCommentsByPostId({
        postId: 'post-1',
        first: undefined as any,
      });

      // Assert: Default should be 20
      expect(mockCommentService.getCommentsByPost).toHaveBeenCalledWith(
        'post-1',
        20,
        undefined
      );
    });
  });
});
