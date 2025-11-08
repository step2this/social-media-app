/**
 * userPostsResolver Tests
 *
 * TDD for public userPosts resolver with pagination.
 * Tests use case composition (profile lookup + posts) and pagination.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphQLError } from 'graphql';
import { createContainer, asValue, InjectionMode, type AwilixContainer } from 'awilix';
import type { GraphQLContainer } from '../../../infrastructure/di/awilix-container.js';
import { createUserPostsResolver } from '../userPostsResolver.js';
import { Cursor } from '../../../shared/types/index.js';

describe('userPostsResolver', () => {
  let container: AwilixContainer<GraphQLContainer>;
  let mockProfileUseCase: { execute: ReturnType<typeof vi.fn> };
  let mockPostsUseCase: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    // Create Awilix container with CLASSIC injection mode
    container = createContainer<GraphQLContainer>({
      injectionMode: InjectionMode.CLASSIC,
    });

    // Create mock use cases
    mockProfileUseCase = { execute: vi.fn() };
    mockPostsUseCase = { execute: vi.fn() };

    // Register mock use cases with camelCase keys (Awilix pattern)
    container.register({
      getProfileByHandle: asValue(mockProfileUseCase as any),
      getUserPosts: asValue(mockPostsUseCase as any),
    });
  });

  describe('Success cases', () => {
    it('should return connection of posts for valid handle', async () => {
      const mockProfile = {
        id: 'user-123',
        handle: '@john',
        fullName: 'John Doe',
        bio: null,
        profilePictureUrl: null,
        createdAt: '2024-01-01T00:00:00Z',
      };

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
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: Cursor('cursor-1'),
          endCursor: Cursor('cursor-1'),
        },
      };

      vi.mocked(mockProfileUseCase.execute).mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      vi.mocked(mockPostsUseCase.execute).mockResolvedValue({
        success: true,
        data: mockConnection,
      });

      const resolver = createUserPostsResolver(container);
      const result = await resolver!(
        {},
        { handle: '@john', first: 10 },
        {} as any,
        {} as any
      );

      expect(result.edges).toHaveLength(1);
      expect(result.pageInfo.hasNextPage).toBe(true);
      expect(mockProfileUseCase.execute).toHaveBeenCalledWith({ handle: '@john' });
      expect(mockPostsUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-123',
        pagination: { first: 10 },
      });
    });

    it('should handle pagination correctly', async () => {
      const mockProfile = {
        id: 'user-456',
        handle: '@alice',
        fullName: 'Alice',
        bio: null,
        profilePictureUrl: null,
        createdAt: '2024-01-01T00:00:00Z',
      };

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

      vi.mocked(mockProfileUseCase.execute).mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      vi.mocked(mockPostsUseCase.execute).mockResolvedValue({
        success: true,
        data: mockConnection,
      });

      const resolver = createUserPostsResolver(container);
      const result = await resolver!(
        {},
        { handle: '@alice', first: 10, after: 'cursor-10' },
        {} as any,
        {} as any
      );

      expect(result.edges).toHaveLength(1);
      expect(result.pageInfo.hasPreviousPage).toBe(true);
      expect(mockPostsUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-456',
        pagination: { first: 10, after: 'cursor-10' },
      });
    });

    it('should handle empty results', async () => {
      const mockProfile = {
        id: 'user-789',
        handle: '@bob',
        fullName: 'Bob',
        bio: null,
        profilePictureUrl: null,
        createdAt: '2024-01-01T00:00:00Z',
      };

      const emptyConnection = {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      };

      vi.mocked(mockProfileUseCase.execute).mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      vi.mocked(mockPostsUseCase.execute).mockResolvedValue({
        success: true,
        data: emptyConnection,
      });

      const resolver = createUserPostsResolver(container);
      const result = await resolver!(
        {},
        { handle: '@bob', first: 10 },
        {} as any,
        {} as any
      );

      expect(result.edges).toHaveLength(0);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });

    it('should support legacy pagination args (limit/cursor)', async () => {
      const mockProfile = {
        id: 'user-321',
        handle: '@charlie',
        fullName: 'Charlie',
        bio: null,
        profilePictureUrl: null,
        createdAt: '2024-01-01T00:00:00Z',
      };

      const mockConnection = {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      };

      vi.mocked(mockProfileUseCase.execute).mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      vi.mocked(mockPostsUseCase.execute).mockResolvedValue({
        success: true,
        data: mockConnection,
      });

      const resolver = createUserPostsResolver(container);
      await resolver!(
        {},
        { handle: '@charlie', limit: 20, cursor: 'old-cursor' },
        {} as any,
        {} as any
      );

      expect(mockPostsUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-321',
        pagination: { first: 20, after: 'old-cursor' },
      });
    });
  });

  describe('Error cases', () => {
    it('should throw NOT_FOUND when profile does not exist', async () => {
      vi.mocked(mockProfileUseCase.execute).mockResolvedValue({
        success: true,
        data: null,
      });

      const resolver = createUserPostsResolver(container);

      await expect(
        resolver!({}, { handle: '@nonexistent', first: 10 }, {} as any, {} as any)
      ).rejects.toThrow(GraphQLError);

      await expect(
        resolver!({}, { handle: '@nonexistent', first: 10 }, {} as any, {} as any)
      ).rejects.toThrow('not found');
    });

    it('should throw error when profile lookup fails', async () => {
      const profileError = new Error('Profile service unavailable');

      vi.mocked(mockProfileUseCase.execute).mockResolvedValue({
        success: false,
        error: profileError,
      });

      const resolver = createUserPostsResolver(container);

      await expect(
        resolver!({}, { handle: '@john', first: 10 }, {} as any, {} as any)
      ).rejects.toThrow(GraphQLError);

      await expect(
        resolver!({}, { handle: '@john', first: 10 }, {} as any, {} as any)
      ).rejects.toThrow('Profile service unavailable');
    });

    it('should throw error when pagination.first invalid', async () => {
      const mockProfile = {
        id: 'user-123',
        handle: '@john',
        fullName: 'John',
        bio: null,
        profilePictureUrl: null,
        createdAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(mockProfileUseCase.execute).mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      const resolver = createUserPostsResolver(container);

      await expect(
        resolver!({}, { handle: '@john', first: 0 }, {} as any, {} as any)
      ).rejects.toThrow(GraphQLError);

      await expect(
        resolver!({}, { handle: '@john', first: 0 }, {} as any, {} as any)
      ).rejects.toThrow('greater than 0');
    });
  });

  // Removed "Use case integration" and "Integration" sections
  // Spy anti-patterns removed - smoke tests cover wiring
});
