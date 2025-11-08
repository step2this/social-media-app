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
import type { GraphQLContext } from '../../../context.js';
import { createMeResolver } from '../meResolver.js';

/**
 * Helper to create a complete mock GraphQLContext with all required fields
 */
function createMockContext(
  overrides: Partial<GraphQLContext> = {}
): GraphQLContext {
  const container = createContainer<GraphQLContainer>({ injectionMode: InjectionMode.CLASSIC });
  
  return {
    userId: null,
    correlationId: 'test-correlation-id',
    dynamoClient: {} as any,
    tableName: 'test-table',
    services: {} as any,
    loaders: {} as any,
    container,
    ...overrides,
  };
}

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
      const mockContext = createMockContext({ userId: 'user-123', container });
      const result = await resolver!({}, {}, mockContext, {} as any);

      expect(result).toEqual(mockProfile);
      expect(mockUseCase.execute).toHaveBeenCalledWith({ userId: 'user-123' });
    });

    it('should throw UNAUTHENTICATED when no userId', async () => {
      const resolver = createMeResolver(container);
      const mockContext = createMockContext({ userId: null, container });

      await expect(
        resolver!({}, {}, mockContext, {} as any)
      ).rejects.toThrow(GraphQLError);

      await expect(
        resolver!({}, {}, mockContext, {} as any)
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
      const mockContext = createMockContext({ userId: 'user-123', container });

      await expect(
        resolver!({}, {}, mockContext, {} as any)
      ).rejects.toThrow(GraphQLError);

      await expect(
        resolver!({}, {}, mockContext, {} as any)
      ).rejects.toThrow('Profile service unavailable');
    });
  });

  // Removed "Use case integration" and "Integration" sections
  // Smoke tests cover wiring - unit tests focus on behavior
});
