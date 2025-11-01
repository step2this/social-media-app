/**
 * meResolver Tests
 *
 * TDD for authenticated me resolver.
 * Tests resolver composition with withAuth and use case integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphQLError } from 'graphql';
import { Container } from '../../../infrastructure/di/Container.js';
import { createMeResolver } from '../meResolver.js';
import { UserId } from '../../../shared/types/index.js';
import type { GetCurrentUserProfile } from '../../../application/use-cases/profile/GetCurrentUserProfile.js';

describe('meResolver', () => {
  let container: Container;
  let mockUseCase: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    container = new Container();
    mockUseCase = { execute: vi.fn() };
    container.register('GetCurrentUserProfile', () => mockUseCase as any);
  });

  describe('Authentication', () => {
    it('should return profile for authenticated user', async () => {
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

      const resolver = createMeResolver(container);
      const result = await resolver({}, {}, { userId: UserId('user-123') }, {} as any);

      expect(result).toEqual(mockProfile);
      expect(mockUseCase.execute).toHaveBeenCalledWith({ userId: 'user-123' });
    });

    it('should throw UNAUTHENTICATED when no userId', async () => {
      const resolver = createMeResolver(container);

      await expect(
        resolver({}, {}, { userId: undefined }, {} as any)
      ).rejects.toThrow(GraphQLError);

      await expect(
        resolver({}, {}, { userId: undefined }, {} as any)
      ).rejects.toThrow('authenticated');

      expect(mockUseCase.execute).not.toHaveBeenCalled();
    });

    it('should throw error when use case fails', async () => {
      const useCaseError = new Error('Profile service unavailable');

      vi.mocked(mockUseCase.execute).mockResolvedValue({
        success: false,
        error: useCaseError,
      });

      const resolver = createMeResolver(container);

      await expect(
        resolver({}, {}, { userId: UserId('user-123') }, {} as any)
      ).rejects.toThrow(GraphQLError);

      await expect(
        resolver({}, {}, { userId: UserId('user-123') }, {} as any)
      ).rejects.toThrow('Profile service unavailable');
    });
  });

  describe('Use case integration', () => {
    it('should call container.resolve with correct key', async () => {
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

      const resolveSpy = vi.spyOn(container, 'resolve');
      const resolver = createMeResolver(container);

      await resolver({}, {}, { userId: UserId('user-456') }, {} as any);

      expect(resolveSpy).toHaveBeenCalledWith('GetCurrentUserProfile');
    });

    it('should pass userId to use case', async () => {
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

      const resolver = createMeResolver(container);

      await resolver({}, {}, { userId: UserId('user-789') }, {} as any);

      expect(mockUseCase.execute).toHaveBeenCalledWith({ userId: 'user-789' });
    });
  });

  describe('Integration', () => {
    it('should work with real use case through container', async () => {
      const mockProfile = {
        id: 'user-321',
        handle: '@charlie',
        fullName: 'Charlie Brown',
        bio: 'Product Manager',
        profilePictureUrl: 'https://example.com/charlie.jpg',
        createdAt: '2024-01-01T00:00:00Z',
      };

      const realUseCase: GetCurrentUserProfile = {
        execute: vi.fn().mockResolvedValue({
          success: true,
          data: mockProfile,
        }),
      } as any;

      container.clear();
      container.register('GetCurrentUserProfile', () => realUseCase);

      const resolver = createMeResolver(container);
      const result = await resolver({}, {}, { userId: UserId('user-321') }, {} as any);

      expect(result).toEqual(mockProfile);
      expect(realUseCase.execute).toHaveBeenCalledWith({ userId: 'user-321' });
    });
  });
});
