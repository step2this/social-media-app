/**
 * postResolver Tests
 *
 * TDD for public post resolver.
 * Tests resolver logic and use case integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphQLError } from 'graphql';
import { createContainer, asValue, InjectionMode, type AwilixContainer } from 'awilix';
import type { GraphQLContainer } from '../../../infrastructure/di/awilix-container.js';
import { createPostResolver } from '../postResolver.js';

describe('postResolver', () => {
  let container: AwilixContainer<GraphQLContainer>;
  let mockUseCase: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    container = createContainer<GraphQLContainer>({
      injectionMode: InjectionMode.CLASSIC,
    });
    mockUseCase = { execute: vi.fn() };
    container.register({
      getPostById: asValue(mockUseCase as any),
    });
  });

  describe('Success cases', () => {
    it('should return post when found', async () => {
      const mockPost = {
        id: 'post-123',
        userId: 'user-456',
        imageUrl: 'https://example.com/image.jpg',
        caption: 'Great photo!',
        likesCount: 10,
        commentsCount: 5,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(mockUseCase.execute).mockResolvedValue({
        success: true,
        data: mockPost,
      });

      const resolver = createPostResolver(container);
      const result = await resolver!({}, { id: 'post-123' }, {} as any, {} as any);

      expect(result).toEqual(mockPost);
      expect(mockUseCase.execute).toHaveBeenCalledWith({ postId: 'post-123' });
    });

    it('should pass postId to use case', async () => {
      const mockPost = {
        id: 'post-456',
        userId: 'user-789',
        imageUrl: 'https://example.com/photo.jpg',
        caption: null,
        likesCount: 0,
        commentsCount: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(mockUseCase.execute).mockResolvedValue({
        success: true,
        data: mockPost,
      });

      const resolver = createPostResolver(container);

      await resolver!({}, { id: 'post-456' }, {} as any, {} as any);

      expect(mockUseCase.execute).toHaveBeenCalledWith({ postId: 'post-456' });
    });
  });

  describe('Error cases', () => {
    it('should throw NOT_FOUND when post does not exist', async () => {
      vi.mocked(mockUseCase.execute).mockResolvedValue({
        success: true,
        data: null,
      });

      const resolver = createPostResolver(container);

      await expect(
        resolver!({}, { id: 'nonexistent' }, {} as any, {} as any)
      ).rejects.toThrow(GraphQLError);

      await expect(
        resolver!({}, { id: 'nonexistent' }, {} as any, {} as any)
      ).rejects.toThrow('not found');

      await expect(
        resolver!({}, { id: 'nonexistent' }, {} as any, {} as any)
      ).rejects.toThrow('nonexistent');
    });

    it('should throw error when use case fails', async () => {
      const useCaseError = new Error('Post service unavailable');

      vi.mocked(mockUseCase.execute).mockResolvedValue({
        success: false,
        error: useCaseError,
      });

      const resolver = createPostResolver(container);

      await expect(
        resolver!({}, { id: 'post-123' }, {} as any, {} as any)
      ).rejects.toThrow(GraphQLError);

      await expect(
        resolver!({}, { id: 'post-123' }, {} as any, {} as any)
      ).rejects.toThrow('Post service unavailable');
    });
  });

  // Removed "Use case integration" and "Integration" sections
  // Spy anti-patterns removed - smoke tests cover wiring
});
