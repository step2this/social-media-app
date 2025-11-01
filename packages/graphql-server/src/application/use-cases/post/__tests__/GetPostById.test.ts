/**
 * GetPostById Use Case Tests
 *
 * TDD for GetPostById use case.
 * This use case retrieves a single post by its ID.
 *
 * Business Logic:
 * - Post ID must be provided
 * - Returns post data on success
 * - Returns NotFoundError if post doesn't exist
 * - Public operation - no authentication required
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IPostRepository } from '../../../../domain/repositories/IPostRepository.js';
import { GetPostById } from '../GetPostById.js';
import { PostId } from '../../../../shared/types/index.js';

describe('GetPostById', () => {
  let mockRepository: IPostRepository;
  let useCase: GetPostById;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findByUser: vi.fn(),
    };
    useCase = new GetPostById(mockRepository);
  });

  describe('execute()', () => {
    it('should return post when valid postId provided', async () => {
      const postId = PostId('post-123');
      const mockPost = {
        id: 'post-123',
        userId: 'user-456',
        imageUrl: 'https://example.com/image.jpg',
        caption: 'Great photo!',
        likesCount: 10,
        commentsCount: 5,
        isLiked: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(mockRepository.findById).mockResolvedValue({
        success: true,
        data: mockPost,
      });

      const result = await useCase.execute({ postId });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('post-123');
        expect(result.data.caption).toBe('Great photo!');
        expect(result.data.likesCount).toBe(10);
      }
    });

    it('should return error when postId is invalid', async () => {
      const result = await useCase.execute({ postId: null as any });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain('required');
      }
    });

    it('should return error when post not found', async () => {
      const postId = PostId('nonexistent');

      vi.mocked(mockRepository.findById).mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await useCase.execute({ postId });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('not found');
        expect(result.error.message).toContain(postId);
      }
    });

    it('should propagate repository errors', async () => {
      const postId = PostId('post-123');
      const dbError = new Error('Database connection failed');

      vi.mocked(mockRepository.findById).mockResolvedValue({
        success: false,
        error: dbError,
      });

      const result = await useCase.execute({ postId });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(dbError);
      }
    });

    it('should call repository with correct postId', async () => {
      const postId = PostId('post-789');

      vi.mocked(mockRepository.findById).mockResolvedValue({
        success: true,
        data: {
          id: 'post-789',
          userId: 'user-123',
          imageUrl: 'https://example.com/photo.jpg',
          caption: null,
          likesCount: 0,
          commentsCount: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      });

      await useCase.execute({ postId });

      expect(mockRepository.findById).toHaveBeenCalledWith(postId);
      expect(mockRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('should handle posts with null caption', async () => {
      const postId = PostId('post-456');
      const mockPost = {
        id: 'post-456',
        userId: 'user-789',
        imageUrl: 'https://example.com/image.jpg',
        caption: null,
        likesCount: 0,
        commentsCount: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(mockRepository.findById).mockResolvedValue({
        success: true,
        data: mockPost,
      });

      const result = await useCase.execute({ postId });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.caption).toBeNull();
      }
    });
  });

  describe('Dependency injection', () => {
    it('should accept IPostRepository via constructor', () => {
      const customRepository = {} as IPostRepository;
      const customUseCase = new GetPostById(customRepository);

      expect(customUseCase).toBeInstanceOf(GetPostById);
    });
  });
});
