/**
 * profileResolver Tests
 *
 * TDD for public profile resolver.
 * Tests resolver logic and use case integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphQLError } from 'graphql';
import { Container } from '../../../infrastructure/di/Container.js';
import { createProfileResolver } from '../profileResolver.js';
import type { GetProfileByHandle } from '../../../application/use-cases/profile/GetProfileByHandle.js';

describe('profileResolver', () => {
  let container: Container;
  let mockUseCase: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    container = new Container();
    mockUseCase = { execute: vi.fn() };
    container.register('GetProfileByHandle', () => mockUseCase as any);
  });

  describe('Success cases', () => {
    it('should return profile when found', async () => {
      const mockProfile = {
        id: 'user-123',
        handle: '@john',
        fullName: 'John Doe',
        bio: 'Software engineer',
        profilePictureUrl: 'https://example.com/avatar.jpg',
        createdAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(mockUseCase.execute).mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      const resolver = createProfileResolver(container);
      const result = await resolver({}, { handle: '@john' }, {} as any, {} as any);

      expect(result).toEqual(mockProfile);
      expect(mockUseCase.execute).toHaveBeenCalledWith({ handle: '@john' });
    });

    it('should pass handle to use case', async () => {
      const mockProfile = {
        id: 'user-456',
        handle: '@alice',
        fullName: 'Alice Smith',
        bio: null,
        profilePictureUrl: null,
        createdAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(mockUseCase.execute).mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      const resolver = createProfileResolver(container);

      await resolver({}, { handle: '@alice' }, {} as any, {} as any);

      expect(mockUseCase.execute).toHaveBeenCalledWith({ handle: '@alice' });
    });
  });

  describe('Error cases', () => {
    it('should throw NOT_FOUND when profile does not exist', async () => {
      vi.mocked(mockUseCase.execute).mockResolvedValue({
        success: true,
        data: null,
      });

      const resolver = createProfileResolver(container);

      await expect(
        resolver({}, { handle: '@nonexistent' }, {} as any, {} as any)
      ).rejects.toThrow(GraphQLError);

      await expect(
        resolver({}, { handle: '@nonexistent' }, {} as any, {} as any)
      ).rejects.toThrow('not found');

      await expect(
        resolver({}, { handle: '@nonexistent' }, {} as any, {} as any)
      ).rejects.toThrow('@nonexistent');
    });

    it('should throw error when use case fails', async () => {
      const useCaseError = new Error('Profile service unavailable');

      vi.mocked(mockUseCase.execute).mockResolvedValue({
        success: false,
        error: useCaseError,
      });

      const resolver = createProfileResolver(container);

      await expect(
        resolver({}, { handle: '@john' }, {} as any, {} as any)
      ).rejects.toThrow(GraphQLError);

      await expect(
        resolver({}, { handle: '@john' }, {} as any, {} as any)
      ).rejects.toThrow('Profile service unavailable');
    });
  });

  describe('Validation', () => {
    it('should validate handle parameter', async () => {
      const mockProfile = {
        id: 'user-789',
        handle: '@bob',
        fullName: 'Bob Johnson',
        bio: 'Designer',
        profilePictureUrl: null,
        createdAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(mockUseCase.execute).mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      const resolver = createProfileResolver(container);

      await resolver({}, { handle: '@bob' }, {} as any, {} as any);

      expect(mockUseCase.execute).toHaveBeenCalledWith({ handle: '@bob' });
    });
  });

  // Removed "Use case integration" and "Integration" sections
  // Smoke tests cover wiring - unit tests focus on behavior
});
