/**
 * followingFeedResolver Tests
 *
 * TDD for authenticated followingFeed resolver with pagination.
 * Tests authentication, pagination, and use case integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphQLError } from 'graphql';
import { Container } from '../../../infrastructure/di/Container.js';
import { createFollowingFeedResolver } from '../followingFeedResolver.js';
import { UserId, Cursor } from '../../../shared/types/index.js';
import type { GetFollowingFeed } from '../../../application/use-cases/feed/GetFollowingFeed.js';

describe('followingFeedResolver', () => {
  let container: Container;
  let mockUseCase: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    container = new Container();
    mockUseCase = { execute: vi.fn() };
    container.register('GetFollowingFeed', () => mockUseCase as any);
  });

  describe('Authentication', () => {
    it('should return feed for authenticated user', async () => {
      const mockConnection = {
        edges: [
          {
            cursor: Cursor('cursor-1'),
            node: {
              id: 'post-1',
              userId: 'user-456',
              imageUrl: 'https://example.com/1.jpg',
              caption: 'Post from followed user',
              likesCount: 15,
              commentsCount: 5,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            },
          },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: Cursor('cursor-1'),
          endCursor: Cursor('cursor-1'),
        },
      };

      vi.mocked(mockUseCase.execute).mockResolvedValue({
        success: true,
        data: mockConnection,
      });

      const resolver = createFollowingFeedResolver(container);
      const result = await resolver(
        {},
        { first: 10 },
        { userId: UserId('user-123') },
        {} as any
      );

      expect(result.edges).toHaveLength(1);
      expect(result.pageInfo.hasNextPage).toBe(true);
    });

    it('should throw UNAUTHENTICATED when no userId', async () => {
      const resolver = createFollowingFeedResolver(container);

      await expect(
        resolver({}, { first: 10 }, { userId: undefined }, {} as any)
      ).rejects.toThrow(GraphQLError);

      await expect(
        resolver({}, { first: 10 }, { userId: undefined }, {} as any)
      ).rejects.toThrow('authenticated');

      expect(mockUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('Pagination', () => {
    it('should handle pagination correctly', async () => {
      const mockConnection = {
        edges: [
          {
            cursor: Cursor('cursor-11'),
            node: {
              id: 'post-11',
              userId: 'user-789',
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

      const resolver = createFollowingFeedResolver(container);
      const result = await resolver(
        {},
        { first: 10, after: 'cursor-10' },
        { userId: UserId('user-123') },
        {} as any
      );

      expect(result.pageInfo.hasPreviousPage).toBe(true);
      expect(mockUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-123',
        pagination: { first: 10, after: 'cursor-10' },
      });
    });

    it('should handle empty feed', async () => {
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

      const resolver = createFollowingFeedResolver(container);
      const result = await resolver(
        {},
        { first: 10 },
        { userId: UserId('user-123') },
        {} as any
      );

      expect(result.edges).toHaveLength(0);
      expect(result.pageInfo.hasNextPage).toBe(false);
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
      const resolver = createFollowingFeedResolver(container);

      await resolver({}, { first: 10 }, { userId: UserId('user-456') }, {} as any);

      expect(resolveSpy).toHaveBeenCalledWith('GetFollowingFeed');
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

      const resolver = createFollowingFeedResolver(container);

      await resolver({}, { first: 20 }, { userId: UserId('user-789') }, {} as any);

      expect(mockUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-789',
        pagination: { first: 20 },
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

      const realUseCase: GetFollowingFeed = {
        execute: vi.fn().mockResolvedValue({
          success: true,
          data: mockConnection,
        }),
      } as any;

      container.clear();
      container.register('GetFollowingFeed', () => realUseCase);

      const resolver = createFollowingFeedResolver(container);
      const result = await resolver(
        {},
        { first: 10 },
        { userId: UserId('user-integration') },
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
