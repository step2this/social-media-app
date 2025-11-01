/**
 * GetFollowingFeed Use Case Tests
 *
 * TDD for GetFollowingFeed use case.
 * This use case retrieves the following feed for an authenticated user.
 *
 * Business Logic:
 * - User must be authenticated (userId required)
 * - Pagination.first must be greater than 0
 * - Returns connection of posts from followed users
 * - Empty feed if user follows no one
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IFeedRepository } from '../../../../domain/repositories/IFeedRepository.js';
import { GetFollowingFeed } from '../GetFollowingFeed.js';
import { UserId, Cursor } from '../../../../shared/types/index.js';

describe('GetFollowingFeed', () => {
  let mockRepository: IFeedRepository;
  let useCase: GetFollowingFeed;

  beforeEach(() => {
    mockRepository = {
      getFollowingFeed: vi.fn(),
      getExploreFeed: vi.fn(),
    };
    useCase = new GetFollowingFeed(mockRepository);
  });

  describe('execute()', () => {
    it('should return feed when authenticated user provided', async () => {
      const userId = UserId('user-123');
      const pagination = { first: 10 };
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

      vi.mocked(mockRepository.getFollowingFeed).mockResolvedValue({
        success: true,
        data: mockConnection,
      });

      const result = await useCase.execute({ userId, pagination });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.edges).toHaveLength(1);
        expect(result.data.pageInfo.hasNextPage).toBe(true);
      }
    });

    it('should return error when userId is invalid (not authenticated)', async () => {
      const pagination = { first: 10 };
      const result = await useCase.execute({ userId: null as any, pagination });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain('authenticated');
      }
    });

    it('should validate pagination.first > 0', async () => {
      const userId = UserId('user-123');
      const pagination = { first: 0 };

      const result = await useCase.execute({ userId, pagination });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('greater than 0');
      }
    });

    it('should validate pagination.first is provided', async () => {
      const userId = UserId('user-123');
      const pagination = {} as any;

      const result = await useCase.execute({ userId, pagination });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('greater than 0');
      }
    });

    it('should handle empty feed (user follows no one)', async () => {
      const userId = UserId('user-123');
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

      vi.mocked(mockRepository.getFollowingFeed).mockResolvedValue({
        success: true,
        data: emptyConnection,
      });

      const result = await useCase.execute({ userId, pagination });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.edges).toHaveLength(0);
        expect(result.data.pageInfo.hasNextPage).toBe(false);
      }
    });

    it('should propagate repository errors', async () => {
      const userId = UserId('user-123');
      const pagination = { first: 10 };
      const dbError = new Error('Feed service unavailable');

      vi.mocked(mockRepository.getFollowingFeed).mockResolvedValue({
        success: false,
        error: dbError,
      });

      const result = await useCase.execute({ userId, pagination });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(dbError);
      }
    });

    it('should pass pagination args correctly to repository', async () => {
      const userId = UserId('user-456');
      const pagination = { first: 20 };

      vi.mocked(mockRepository.getFollowingFeed).mockResolvedValue({
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

      await useCase.execute({ userId, pagination });

      expect(mockRepository.getFollowingFeed).toHaveBeenCalledWith(userId, pagination);
      expect(mockRepository.getFollowingFeed).toHaveBeenCalledTimes(1);
    });

    it('should handle cursor-based pagination', async () => {
      const userId = UserId('user-123');
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

      vi.mocked(mockRepository.getFollowingFeed).mockResolvedValue({
        success: true,
        data: mockConnection,
      });

      const result = await useCase.execute({ userId, pagination });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pageInfo.hasPreviousPage).toBe(true);
      }
      expect(mockRepository.getFollowingFeed).toHaveBeenCalledWith(userId, pagination);
    });
  });

  describe('Dependency injection', () => {
    it('should accept IFeedRepository via constructor', () => {
      const customRepository = {} as IFeedRepository;
      const customUseCase = new GetFollowingFeed(customRepository);

      expect(customUseCase).toBeInstanceOf(GetFollowingFeed);
    });
  });
});
