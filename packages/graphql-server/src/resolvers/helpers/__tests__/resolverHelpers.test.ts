/**
 * resolverHelpers Tests
 *
 * TDD for resolver helper utilities.
 * Tests executeUseCase helper with various success and error scenarios.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphQLError } from 'graphql';
import { createContainer, asValue, InjectionMode, type AwilixContainer } from 'awilix';
import type { GraphQLContainer } from '../../../infrastructure/di/awilix-container.js';
import { executeUseCase } from '../resolverHelpers.js';
import { UserId } from '../../../shared/types/index.js';

describe('executeUseCase', () => {
  let container: AwilixContainer<GraphQLContainer>;
  let mockUseCase: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    container = createContainer<GraphQLContainer>({ injectionMode: InjectionMode.CLASSIC });
    mockUseCase = { execute: vi.fn() };
  });

  describe('Successful execution', () => {
    it('should return data when use case succeeds', async () => {
      const mockProfile = {
        id: 'user-123',
        handle: '@john',
        fullName: 'John Doe',
      };

      vi.mocked(mockUseCase.execute).mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      container.register({ getCurrentUserProfile: asValue(mockUseCase as any) });

      const result = await executeUseCase(
        container,
        'getCurrentUserProfile',
        { userId: UserId('user-123') }
      );

      expect(result).toEqual(mockProfile);
      expect(mockUseCase.execute).toHaveBeenCalledWith({ userId: 'user-123' });
    });

    it('should return data for connection queries without NOT_FOUND', async () => {
      const mockPosts = {
        edges: [{ node: { id: 'post-1' }, cursor: 'cursor-1' }],
        pageInfo: { hasNextPage: false, endCursor: null },
      };

      vi.mocked(mockUseCase.execute).mockResolvedValue({
        success: true,
        data: mockPosts,
      });

      container.register({ getUserPosts: asValue(mockUseCase as any) });

      const result = await executeUseCase(
        container,
        'getUserPosts',
        { handle: '@john', first: 10 }
      );

      expect(result).toEqual(mockPosts);
    });
  });

  describe('Error handling - INTERNAL_SERVER_ERROR', () => {
    it('should throw INTERNAL_SERVER_ERROR when use case fails', async () => {
      const useCaseError = new Error('Database connection failed');

      vi.mocked(mockUseCase.execute).mockResolvedValue({
        success: false,
        error: useCaseError,
      });

      container.register({ getCurrentUserProfile: asValue(mockUseCase as any) });

      await expect(
        executeUseCase(
          container,
          'getCurrentUserProfile',
          { userId: UserId('user-123') }
        )
      ).rejects.toThrow(GraphQLError);

      await expect(
        executeUseCase(
          container,
          'getCurrentUserProfile',
          { userId: UserId('user-123') }
        )
      ).rejects.toThrow('Database connection failed');
    });

    it('should throw INTERNAL_SERVER_ERROR with error message from use case', async () => {
      const useCaseError = new Error('Profile service unavailable');

      vi.mocked(mockUseCase.execute).mockResolvedValue({
        success: false,
        error: useCaseError,
      });

      container.register({ getProfileByHandle: asValue(mockUseCase as any) });

      await expect(
        executeUseCase(
          container,
          'getProfileByHandle',
          { handle: '@john' }
        )
      ).rejects.toThrow('Profile service unavailable');
    });
  });

  describe('Error handling - NOT_FOUND', () => {
    it('should throw NOT_FOUND when data is null and notFoundEntity provided', async () => {
      vi.mocked(mockUseCase.execute).mockResolvedValue({
        success: true,
        data: null,
      });

      container.register({ getCurrentUserProfile: asValue(mockUseCase as any) });

      await expect(
        executeUseCase(
          container,
          'getCurrentUserProfile',
          { userId: UserId('user-123') },
          { notFoundEntity: 'Profile', notFoundId: 'user-123' }
        )
      ).rejects.toThrow(GraphQLError);

      await expect(
        executeUseCase(
          container,
          'getCurrentUserProfile',
          { userId: UserId('user-123') },
          { notFoundEntity: 'Profile', notFoundId: 'user-123' }
        )
      ).rejects.toThrow('Profile');
    });

    it('should throw NOT_FOUND when data is undefined and notFoundEntity provided', async () => {
      vi.mocked(mockUseCase.execute).mockResolvedValue({
        success: true,
        data: undefined,
      });

      container.register({ getProfileByHandle: asValue(mockUseCase as any) });

      await expect(
        executeUseCase(
          container,
          'getProfileByHandle',
          { handle: '@missing' },
          { notFoundEntity: 'Profile', notFoundId: '@missing' }
        )
      ).rejects.toThrow(GraphQLError);
    });

    it('should not throw NOT_FOUND when notFoundEntity is not provided', async () => {
      vi.mocked(mockUseCase.execute).mockResolvedValue({
        success: true,
        data: null,
      });

      container.register({ getCurrentUserProfile: asValue(mockUseCase as any) });

      const result = await executeUseCase(
        container,
        'getCurrentUserProfile',
        { userId: UserId('user-123') }
      );

      expect(result).toBeNull();
    });
  });

  describe('Container integration', () => {
    it('should resolve use case from container using correct name', async () => {
      const mockData = { id: 'post-123', content: 'Hello' };

      vi.mocked(mockUseCase.execute).mockResolvedValue({
        success: true,
        data: mockData,
      });

      // Register with a specific use case name
      container.register({ getPostById: asValue(mockUseCase as any) });

      const result = await executeUseCase(
        container,
        'getPostById',
        { postId: 'post-123' }
      );

      expect(result).toEqual(mockData);
    });
  });
});
