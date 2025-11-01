/**
 * userPostsResolver Tests
 *
 * TDD for public userPosts resolver with pagination.
 * Tests resolver logic, pagination, and use case integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphQLError } from 'graphql';
import { Container } from '../../../infrastructure/di/Container.js';
import { createUserPostsResolver } from '../userPostsResolver.js';
import { UserId, Cursor } from '../../../shared/types/index.js';
import type { GetUserPosts } from '../../../application/use-cases/post/GetUserPosts.js';

describe('userPostsResolver', () => {
  let container: Container;
  let mockUseCase: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    container = new Container();
    mockUseCase = { execute: vi.fn() };
    container.register('GetUserPosts', () => mockUseCase as any);
  });

  describe('Success cases', () => {
    it('should return connection of posts', async () => {
      const mockConnection = {
        edges: [
          {
            cursor: Cursor('cursor-1'),
            node: {
              id: 'post-1',
              userId: 'user-123',
              imageUrl: 'https://example.com/1.jpg',
              caption: 'Post 1',
              likesCount: 5,
              commentsCount: 2,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            },
          },
          {
            cursor: Cursor('cursor-2'),
            node: {
              id: 'post-2',
              userId: 'user-123',
              imageUrl: 'https://example.com/2.jpg',
              caption: 'Post 2',
              likesCount: 10,
              commentsCount: 3,
              createdAt: '2024-01-02T00:00:00Z',
              updatedAt: '2024-01-02T00:00:00Z',
            },
          },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: Cursor('cursor-1'),
          endCursor: Cursor('cursor-2'),
        },
      };

      vi.mocked(mockUseCase.execute).mockResolvedValue({
        success: true,
        data: mockConnection,
      });

      const resolver = createUserPostsResolver(container);
      const result = await resolver(
        {},
        { userId: 'user-123', first: 10 },
        {} as any,
        {} as any
      );

      expect(result.edges).toHaveLength(2);
      expect(result.pageInfo.hasNextPage).toBe(true);
    });

    it('should handle pagination correctly', async () => {
      const mockConnection = {
        edges: [
          {
            cursor: Cursor('cursor-11'),
            node: {
              id: 'post-11',
              userId: 'user-456',
              imageUrl: 'https://example.com/11.jpg',
              caption: null,
              likesCount: 0,
              commentsCount: 0,
              createdAt: '2024-01-11T00:00:00Z',
              updatedAt: '2024-01-11T00:00:00Z',
            },
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: true,
          startCursor: Cursor('cursor-11'),
          endCursor: Cursor('cursor-11'),
        },
      };

      vi.mocked(mockUseCase.execute).mockResolvedValue({
        success: true,
        data: mockConnection,
      });

      const resolver = createUserPostsResolver(container);
      const result = await resolver(
        {},
        { userId: 'user-456', first: 10, after: 'cursor-10' },
        {} as any,
        {} as any
      );

      expect(result.edges).toHaveLength(1);
      expect(result.pageInfo.hasPreviousPage).toBe(true);
      expect(mockUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-456',
        pagination: { first: 10, after: 'cursor-10' },
      });
    });

    it('should handle empty results', async () => {
      const emptyConnection = {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      };

      vi.mocked(mockUseCase.execute).mockResolvedValue({
        success: true,
        data: emptyConnection,
      });

      const resolver = createUserPostsResolver(container);
      const result = await resolver(
        {},
        { userId: 'user-123', first: 10 },
        {} as any,
        {} as any
      );

      expect(result.edges).toHaveLength(0);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });
  });

  describe('Error cases', () => {
    it('should throw error when use case fails with invalid userId', async () => {
      const useCaseError = new Error('User ID is required');

      vi.mocked(mockUseCase.execute).mockResolvedValue({
        success: false,
        error: useCaseError,
      });

      const resolver = createUserPostsResolver(container);

      await expect(
        resolver({}, { userId: '', first: 10 }, {} as any, {} as any)
      ).rejects.toThrow(GraphQLError);
    });

    it('should throw error when pagination.first invalid', async () => {
      const resolver = createUserPostsResolver(container);

      await expect(
        resolver({}, { userId: 'user-123', first: 0 }, {} as any, {} as any)
      ).rejects.toThrow(GraphQLError);

      await expect(
        resolver({}, { userId: 'user-123', first: 0 }, {} as any, {} as any)
      ).rejects.toThrow('greater than 0');
    });
  });

  describe('Use case integration', () => {
    it('should call container.resolve with correct key', async () => {
      const mockConnection = {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      };

      vi.mocked(mockUseCase.execute).mockResolvedValue({
        success: true,
        data: mockConnection,
      });

      const resolveSpy = vi.spyOn(container, 'resolve');
      const resolver = createUserPostsResolver(container);

      await resolver({}, { userId: 'user-789', first: 20 }, {} as any, {} as any);

      expect(resolveSpy).toHaveBeenCalledWith('GetUserPosts');
    });

    it('should pass userId and pagination to use case', async () => {
      const mockConnection = {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      };

      vi.mocked(mockUseCase.execute).mockResolvedValue({
        success: true,
        data: mockConnection,
      });

      const resolver = createUserPostsResolver(container);

      await resolver({}, { userId: 'user-999', first: 15 }, {} as any, {} as any);

      expect(mockUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-999',
        pagination: { first: 15 },
      });
    });
  });

  describe('Integration', () => {
    it('should work with real use case through container', async () => {
      const mockConnection = {
        edges: [
          {
            cursor: Cursor('cursor-1'),
            node: {
              id: 'post-integration',
              userId: 'user-integration',
              imageUrl: 'https://example.com/integration.jpg',
              caption: 'Integration test',
              likesCount: 100,
              commentsCount: 50,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            },
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: Cursor('cursor-1'),
          endCursor: Cursor('cursor-1'),
        },
      };

      const realUseCase: GetUserPosts = {
        execute: vi.fn().mockResolvedValue({
          success: true,
          data: mockConnection,
        }),
      } as any;

      container.clear();
      container.register('GetUserPosts', () => realUseCase);

      const resolver = createUserPostsResolver(container);
      const result = await resolver(
        {},
        { userId: 'user-integration', first: 10 },
        {} as any,
        {} as any
      );

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node.id).toBe('post-integration');
      expect(realUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-integration',
        pagination: { first: 10 },
      });
    });
  });
});
