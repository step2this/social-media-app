/**
 * meResolver Tests
 *
 * TDD for authenticated me resolver.
 * Tests resolver composition with withAuth and use case integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphQLError } from 'graphql';
import { createContainer, asValue, InjectionMode, type AwilixContainer } from 'awilix';
import type { GraphQLContainer } from '../../../infrastructure/di/awilix-container.js';
import { createMeResolver } from '../meResolver.js';
import { UserId } from '../../../shared/types/index.js';

describe('meResolver', () => {
  let container: AwilixContainer<GraphQLContainer>;
  let mockUseCase: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    container = createContainer<GraphQLContainer>({ injectionMode: InjectionMode.CLASSIC });
    mockUseCase = { execute: vi.fn() };
    container.register({ getCurrentUserProfile: asValue(mockUseCase as any) });
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
      const result = await resolver!({}, {}, { userId: UserId('user-123') }, {} as any);

      expect(result).toEqual(mockProfile);
      expect(mockUseCase.execute).toHaveBeenCalledWith({ userId: 'user-123' });
    });

    it('should throw UNAUTHENTICATED when no userId', async () => {
      const resolver = createMeResolver(container);

      await expect(
        resolver!({}, {}, { userId: undefined }, {} as any)
      ).rejects.toThrow(GraphQLError);

      await expect(
        resolver!({}, {}, { userId: undefined }, {} as any)
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
        resolver!({}, {}, { userId: UserId('user-123') }, {} as any)
      ).rejects.toThrow(GraphQLError);

      await expect(
        resolver!({}, {}, { userId: UserId('user-123') }, {} as any)
      ).rejects.toThrow('Profile service unavailable');
    });
  });

  // Removed "Use case integration" and "Integration" sections
  // Smoke tests cover wiring - unit tests focus on behavior
});
