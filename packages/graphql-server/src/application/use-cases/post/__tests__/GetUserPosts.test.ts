/**
 * GetUserPosts Use Case Tests
 *
 * TDD for GetUserPosts use case.
 * This use case retrieves posts for a specific user (paginated).
 *
 * Business Logic:
 * - User ID must be provided
 * - Pagination.first must be greater than 0
 * - Returns connection of posts on success
 * - Public operation - no authentication required
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IPostRepository } from '../../../../domain/repositories/IPostRepository.js';
import { GetUserPosts } from '../GetUserPosts.js';
import { UserId, Cursor } from '../../../../shared/types/index.js';

describe('GetUserPosts', () => {
  let mockRepository: IPostRepository;
  let useCase: GetUserPosts;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findByUser: vi.fn(),
    };
    useCase = new GetUserPosts(mockRepository);
  });

  describe('execute()', () => {
    it('should return connection when valid userId provided', async () => {
      const userId = UserId('user-123');
      const pagination = { first: 10 };
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

      vi.mocked(mockRepository.findByUser).mockResolvedValue({
        success: true,
        data: mockConnection,
      });

      const result = await useCase.execute({ userId, pagination });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.edges).toHaveLength(2);
        expect(result.data.pageInfo.hasNextPage).toBe(true);
      }
    });

    it('should return error when userId is invalid', async () => {
      const pagination = { first: 10 };
      const result = await useCase.execute({ userId: null as any, pagination });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain('required');
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

    it('should handle empty results (no posts)', async () => {
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

      vi.mocked(mockRepository.findByUser).mockResolvedValue({
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
      const dbError = new Error('Database connection failed');

      vi.mocked(mockRepository.findByUser).mockResolvedValue({
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

      vi.mocked(mockRepository.findByUser).mockResolvedValue({
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

      expect(mockRepository.findByUser).toHaveBeenCalledWith(userId, pagination);
      expect(mockRepository.findByUser).toHaveBeenCalledTimes(1);
    });

    it('should handle cursor-based pagination (after parameter)', async () => {
      const userId = UserId('user-123');
      const pagination = { first: 10, after: Cursor('cursor-10') };
      const mockConnection = {
        edges: [
          {
            cursor: Cursor('cursor-11'),
            node: {
              id: 'post-11',
              userId: 'user-123',
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

      vi.mocked(mockRepository.findByUser).mockResolvedValue({
        success: true,
        data: mockConnection,
      });

      const result = await useCase.execute({ userId, pagination });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pageInfo.hasPreviousPage).toBe(true);
      }
      expect(mockRepository.findByUser).toHaveBeenCalledWith(userId, pagination);
    });
  });

  describe('Dependency injection', () => {
    it('should accept IPostRepository via constructor', () => {
      const customRepository = {} as IPostRepository;
      const customUseCase = new GetUserPosts(customRepository);

      expect(customUseCase).toBeInstanceOf(GetUserPosts);
    });
  });
});
