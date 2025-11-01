/**
 * GetExploreFeed Use Case Tests
 *
 * TDD for GetExploreFeed use case.
 * This use case retrieves the explore feed for discovery.
 *
 * Business Logic:
 * - Pagination.first must be greater than 0
 * - Returns connection of posts for discovery
 * - Supports anonymous users (no viewerId)
 * - Supports authenticated users (with viewerId for personalization)
 * - Public operation - authentication optional
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IFeedRepository } from '../../../../domain/repositories/IFeedRepository.js';
import { GetExploreFeed } from '../GetExploreFeed.js';
import { UserId, Cursor } from '../../../../shared/types/index.js';

describe('GetExploreFeed', () => {
  let mockRepository: IFeedRepository;
  let useCase: GetExploreFeed;

  beforeEach(() => {
    mockRepository = {
      getFollowingFeed: vi.fn(),
      getExploreFeed: vi.fn(),
    };
    useCase = new GetExploreFeed(mockRepository);
  });

  describe('execute()', () => {
    it('should return feed for anonymous user (no viewerId)', async () => {
      const pagination = { first: 10 };
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

      vi.mocked(mockRepository.getExploreFeed).mockResolvedValue({
        success: true,
        data: mockConnection,
      });

      const result = await useCase.execute({ pagination });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.edges).toHaveLength(1);
      }
      expect(mockRepository.getExploreFeed).toHaveBeenCalledWith(pagination, undefined);
    });

    it('should return personalized feed for authenticated user (with viewerId)', async () => {
      const pagination = { first: 10 };
      const viewerId = UserId('user-123');
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

      vi.mocked(mockRepository.getExploreFeed).mockResolvedValue({
        success: true,
        data: mockConnection,
      });

      const result = await useCase.execute({ pagination, viewerId });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.edges).toHaveLength(1);
      }
      expect(mockRepository.getExploreFeed).toHaveBeenCalledWith(pagination, viewerId);
    });

    it('should validate pagination.first > 0', async () => {
      const pagination = { first: 0 };

      const result = await useCase.execute({ pagination });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('greater than 0');
      }
    });

    it('should validate pagination.first is provided', async () => {
      const pagination = {} as any;

      const result = await useCase.execute({ pagination });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('greater than 0');
      }
    });

    it('should handle empty explore feed', async () => {
      const pagination = { first: 10 };
      const emptyConnection = {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      };

      vi.mocked(mockRepository.getExploreFeed).mockResolvedValue({
        success: true,
        data: emptyConnection,
      });

      const result = await useCase.execute({ pagination });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.edges).toHaveLength(0);
        expect(result.data.pageInfo.hasNextPage).toBe(false);
      }
    });

    it('should propagate repository errors', async () => {
      const pagination = { first: 10 };
      const serviceError = new Error('Explore feed service unavailable');

      vi.mocked(mockRepository.getExploreFeed).mockResolvedValue({
        success: false,
        error: serviceError,
      });

      const result = await useCase.execute({ pagination });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(serviceError);
      }
    });

    it('should pass pagination args correctly', async () => {
      const pagination = { first: 20 };

      vi.mocked(mockRepository.getExploreFeed).mockResolvedValue({
        success: true,
        data: {
          edges: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
        },
      });

      await useCase.execute({ pagination });

      expect(mockRepository.getExploreFeed).toHaveBeenCalledWith(pagination, undefined);
      expect(mockRepository.getExploreFeed).toHaveBeenCalledTimes(1);
    });

    it('should pass viewerId when provided', async () => {
      const pagination = { first: 10 };
      const viewerId = UserId('user-789');

      vi.mocked(mockRepository.getExploreFeed).mockResolvedValue({
        success: true,
        data: {
          edges: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
        },
      });

      await useCase.execute({ pagination, viewerId });

      expect(mockRepository.getExploreFeed).toHaveBeenCalledWith(pagination, viewerId);
    });

    it('should handle cursor-based pagination', async () => {
      const pagination = { first: 10, after: Cursor('cursor-10') };
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

      vi.mocked(mockRepository.getExploreFeed).mockResolvedValue({
        success: true,
        data: mockConnection,
      });

      const result = await useCase.execute({ pagination });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pageInfo.hasPreviousPage).toBe(true);
      }
      expect(mockRepository.getExploreFeed).toHaveBeenCalledWith(pagination, undefined);
    });
  });

  describe('Dependency injection', () => {
    it('should accept IFeedRepository via constructor', () => {
      const customRepository = {} as IFeedRepository;
      const customUseCase = new GetExploreFeed(customRepository);

      expect(customUseCase).toBeInstanceOf(GetExploreFeed);
    });
  });
});
