/**
 * exploreFeedResolver Tests
 *
 * TDD for public exploreFeed resolver with pagination.
 * Tests pagination, use case integration, and optional authentication.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Container } from '../../../infrastructure/di/Container.js';
import { createExploreFeedResolver } from '../exploreFeedResolver.js';
import { UserId, Cursor } from '../../../shared/types/index.js';

describe('exploreFeedResolver', () => {
  let container: Container;
  let mockUseCase: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    container = new Container();
    mockUseCase = { execute: vi.fn() };
    container.register('GetExploreFeed', () => mockUseCase as any);
  });

  describe('Anonymous access', () => {
    it('should return feed for anonymous user', async () => {
      const mockConnection = {
        edges: [
          {
            cursor: Cursor('cursor-1'),
            node: {
              id: 'post-1',
              userId: 'user-123',
              imageUrl: 'https://example.com/1.jpg',
              caption: 'Trending post',
              likesCount: 100,
              commentsCount: 20,
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

      const resolver = createExploreFeedResolver(container);
      const result = await resolver({}, { first: 10 }, { userId: undefined }, {} as any);

      expect(result.edges).toHaveLength(1);
      expect(mockUseCase.execute).toHaveBeenCalledWith({
        pagination: { first: 10 },
        viewerId: undefined,
      });
    });
  });

  describe('Authenticated access', () => {
    it('should return feed for authenticated user (with viewerId)', async () => {
      const mockConnection = {
        edges: [
          {
            cursor: Cursor('cursor-1'),
            node: {
              id: 'post-1',
              userId: 'user-456',
              imageUrl: 'https://example.com/1.jpg',
              caption: 'Personalized post',
              likesCount: 50,
              commentsCount: 10,
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

      const resolver = createExploreFeedResolver(container);
      const result = await resolver(
        {},
        { first: 10 },
        { userId: UserId('user-123') },
        {} as any
      );

      expect(result.edges).toHaveLength(1);
      expect(mockUseCase.execute).toHaveBeenCalledWith({
        pagination: { first: 10 },
        viewerId: 'user-123',
      });
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

      const resolver = createExploreFeedResolver(container);
      const result = await resolver(
        {},
        { first: 10, after: 'cursor-10' },
        { userId: undefined },
        {} as any
      );

      expect(result.pageInfo.hasPreviousPage).toBe(true);
      expect(mockUseCase.execute).toHaveBeenCalledWith({
        pagination: { first: 10, after: 'cursor-10' },
        viewerId: undefined,
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

      const resolver = createExploreFeedResolver(container);
      const result = await resolver({}, { first: 10 }, { userId: undefined }, {} as any);

      expect(result.edges).toHaveLength(0);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });
  });

  // Removed "Use case integration" and "Integration" sections
  // Spy anti-patterns removed - smoke tests cover wiring
});
