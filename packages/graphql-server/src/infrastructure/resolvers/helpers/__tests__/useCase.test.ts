/**
 * Use Case Helper Tests
 *
 * Tests for executeUseCase, executeOptionalUseCase, and executeUseCaseRaw helpers.
 * These helpers provide consistent error handling for use case execution in resolvers.
 *
 * Note: Tests use generic Errors to avoid workspace package dependencies.
 * Integration tests with real error types are in the main test suite.
 */

import { describe, it, expect, vi } from 'vitest';
import { GraphQLError } from 'graphql';
import {
  executeUseCase,
  executeOptionalUseCase,
  executeUseCaseRaw,
} from '../useCase.js';
import type { Result } from '../../../../shared/types/result.js';

describe('executeUseCase', () => {
  describe('Success Cases', () => {
    it('should return data when use case succeeds', async () => {
      const mockUseCase = {
        execute: vi.fn().mockResolvedValue({
          success: true,
          data: { id: '123', name: 'Test User' },
        }),
      };

      const result = await executeUseCase(mockUseCase, { userId: '123' });

      expect(result).toEqual({ id: '123', name: 'Test User' });
      expect(mockUseCase.execute).toHaveBeenCalledWith({ userId: '123' });
    });

    it('should handle string data', async () => {
      const mockUseCase = {
        execute: vi.fn().mockResolvedValue({
          success: true,
          data: 'success-message',
        }),
      };

      const result = await executeUseCase(mockUseCase, {});

      expect(result).toBe('success-message');
    });

    it('should handle array data', async () => {
      const mockUseCase = {
        execute: vi.fn().mockResolvedValue({
          success: true,
          data: [1, 2, 3],
        }),
      };

      const result = await executeUseCase(mockUseCase, {});

      expect(result).toEqual([1, 2, 3]);
    });

    it('should handle number data (including 0)', async () => {
      const mockUseCase = {
        execute: vi.fn().mockResolvedValue({
          success: true,
          data: 0,
        }),
      };

      const result = await executeUseCase(mockUseCase, {});

      expect(result).toBe(0);
    });

    it('should handle boolean data (including false)', async () => {
      const mockUseCase = {
        execute: vi.fn().mockResolvedValue({
          success: true,
          data: false,
        }),
      };

      const result = await executeUseCase(mockUseCase, {});

      expect(result).toBe(false);
    });
  });

  describe('Failure Cases', () => {
    it('should throw GraphQLError when use case fails', async () => {
      const error = new Error('Something went wrong');
      const mockUseCase = {
        execute: vi.fn().mockResolvedValue({
          success: false,
          error,
        }),
      };

      await expect(executeUseCase(mockUseCase, {})).rejects.toThrow(GraphQLError);
      await expect(executeUseCase(mockUseCase, {})).rejects.toThrow('Something went wrong');
    });

    it('should preserve error message when throwing', async () => {
      const error = new Error('Custom error message');
      const mockUseCase = {
        execute: vi.fn().mockResolvedValue({
          success: false,
          error,
        }),
      };

      try {
        await executeUseCase(mockUseCase, {});
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(GraphQLError);
        const graphqlError = err as GraphQLError;
        expect(graphqlError.message).toBe('Custom error message');
      }
    });

    it('should throw GraphQLError when data is undefined', async () => {
      const mockUseCase = {
        execute: vi.fn().mockResolvedValue({
          success: true,
          data: undefined,
        }),
      };

      await expect(executeUseCase(mockUseCase, {})).rejects.toThrow(GraphQLError);
      await expect(executeUseCase(mockUseCase, {})).rejects.toThrow('Use case returned no data');
    });

    it('should throw GraphQLError when data is null', async () => {
      const mockUseCase = {
        execute: vi.fn().mockResolvedValue({
          success: true,
          data: null,
        }),
      };

      await expect(executeUseCase(mockUseCase, {})).rejects.toThrow(GraphQLError);
      await expect(executeUseCase(mockUseCase, {})).rejects.toThrow('Use case returned no data');
    });
  });

  describe('Type Safety', () => {
    it('should preserve input and output types', async () => {
      interface Input {
        userId: string;
      }
      interface Output {
        id: string;
        name: string;
      }

      const mockUseCase: { execute: (input: Input) => Promise<Result<Output>> } = {
        execute: vi.fn().mockResolvedValue({
          success: true,
          data: { id: '123', name: 'Test' },
        }),
      };

      const result = await executeUseCase(mockUseCase, { userId: '123' });

      // TypeScript should infer result as Output
      expect(result.id).toBe('123');
      expect(result.name).toBe('Test');
    });
  });
});

describe('executeOptionalUseCase', () => {
  describe('Success Cases', () => {
    it('should return data when use case succeeds', async () => {
      const mockUseCase = {
        execute: vi.fn().mockResolvedValue({
          success: true,
          data: { id: '123', name: 'Test User' },
        }),
      };

      const result = await executeOptionalUseCase(mockUseCase, { userId: '123' });

      expect(result).toEqual({ id: '123', name: 'Test User' });
    });

    it('should return null when data is undefined', async () => {
      const mockUseCase = {
        execute: vi.fn().mockResolvedValue({
          success: true,
          data: undefined,
        }),
      };

      const result = await executeOptionalUseCase(mockUseCase, {});

      expect(result).toBeNull();
    });

    it('should return null when data is null', async () => {
      const mockUseCase = {
        execute: vi.fn().mockResolvedValue({
          success: true,
          data: null,
        }),
      };

      const result = await executeOptionalUseCase(mockUseCase, {});

      expect(result).toBeNull();
    });
  });

  describe('Failure Cases', () => {
    it('should return null when use case fails (not throw)', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const error = new Error('Something went wrong');
      const mockUseCase = {
        execute: vi.fn().mockResolvedValue({
          success: false,
          error,
        }),
      };

      const result = await executeOptionalUseCase(mockUseCase, {});

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Use case failed for optional field:',
        error
      );

      consoleWarnSpy.mockRestore();
    });

    it('should log error but not throw', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const error = new Error('Profile not found');
      const mockUseCase = {
        execute: vi.fn().mockResolvedValue({
          success: false,
          error,
        }),
      };

      const result = await executeOptionalUseCase(mockUseCase, {});

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Type Safety', () => {
    it('should return T | null', async () => {
      interface Output {
        id: string;
      }

      const mockUseCase: { execute: (input: {}) => Promise<Result<Output>> } = {
        execute: vi.fn().mockResolvedValue({
          success: true,
          data: { id: '123' },
        }),
      };

      const result = await executeOptionalUseCase(mockUseCase, {});

      // TypeScript should infer result as Output | null
      if (result) {
        expect(result.id).toBe('123');
      }
    });
  });
});

describe('executeUseCaseRaw', () => {
  it('should return Result directly without transformation', async () => {
    const successResult = {
      success: true as const,
      data: { id: '123' },
    };

    const mockUseCase = {
      execute: vi.fn().mockResolvedValue(successResult),
    };

    const result = await executeUseCaseRaw(mockUseCase, {});

    expect(result).toEqual(successResult);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ id: '123' });
    }
  });

  it('should return failure Result without throwing', async () => {
    const error = new Error('Test error');
    const failureResult = {
      success: false as const,
      error,
    };

    const mockUseCase = {
      execute: vi.fn().mockResolvedValue(failureResult),
    };

    const result = await executeUseCaseRaw(mockUseCase, {});

    expect(result).toEqual(failureResult);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(error);
    }
  });

  it('should allow custom error handling', async () => {
    const error = new Error('Access denied');
    const mockUseCase = {
      execute: vi.fn().mockResolvedValue({
        success: false,
        error,
      }),
    };

    const result = await executeUseCaseRaw(mockUseCase, {});

    // Custom handling based on error
    if (!result.success) {
      expect(result.error.message).toBe('Access denied');
    }
  });

  describe('Type Safety', () => {
    it('should preserve Result<T> type', async () => {
      interface Output {
        count: number;
      }

      const mockUseCase: { execute: (input: {}) => Promise<Result<Output>> } = {
        execute: vi.fn().mockResolvedValue({
          success: true,
          data: { count: 42 },
        }),
      };

      const result = await executeUseCaseRaw(mockUseCase, {});

      // TypeScript should infer result as Result<Output>
      if (result.success) {
        expect(result.data.count).toBe(42);
      }
    });
  });
});

describe('Integration Scenarios', () => {
  it('executeUseCase should be used for non-nullable GraphQL fields', async () => {
    // Simulating Query.me which returns Profile! (non-nullable)
    const mockUseCase = {
      execute: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'user-123',
          username: 'john',
          email: 'john@example.com',
          emailVerified: true,
          handle: '@john',
          followersCount: 100,
          followingCount: 50,
          postsCount: 25,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      }),
    };

    const profile = await executeUseCase(mockUseCase, { userId: 'user-123' });

    expect(profile).toBeDefined();
    expect(profile.id).toBe('user-123');
  });

  it('executeOptionalUseCase should be used for nullable GraphQL fields', async () => {
    // Simulating Query.profile which returns PublicProfile (nullable)
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const mockUseCase = {
      execute: vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Profile not found'),
      }),
    };

    const profile = await executeOptionalUseCase(mockUseCase, { handle: '@nonexistent' });

    expect(profile).toBeNull(); // GraphQL can return null

    consoleWarnSpy.mockRestore();
  });

  it('executeUseCaseRaw should be used when custom error logic is needed', async () => {
    const mockUseCase = {
      execute: vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Invalid handle format'),
      }),
    };

    const result = await executeUseCaseRaw(mockUseCase, { handle: 'invalid' });

    // Custom logic: handle specific error types
    if (!result.success) {
      expect(result.error.message).toBe('Invalid handle format');
      // Resolver can throw custom GraphQLError here
    }
  });

  it('should handle complex nested objects', async () => {
    const mockUseCase = {
      execute: vi.fn().mockResolvedValue({
        success: true,
        data: {
          user: {
            id: '123',
            profile: {
              name: 'John',
              settings: {
                theme: 'dark',
                notifications: true,
              },
            },
          },
        },
      }),
    };

    const result = await executeUseCase(mockUseCase, {});

    expect(result.user.id).toBe('123');
    expect(result.user.profile.settings.theme).toBe('dark');
  });
});
