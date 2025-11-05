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

  // Removed "Use case integration" and "Integration" sections
  // Spy anti-patterns removed - smoke tests cover wiring
});
