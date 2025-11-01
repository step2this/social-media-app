/**
 * withAuth HOC Tests
 *
 * TDD for withAuth higher-order component.
 * Tests authentication wrapper logic for GraphQL resolvers.
 */

import { describe, it, expect, vi } from 'vitest';
import type { GraphQLFieldResolver } from 'graphql';
import { GraphQLError } from 'graphql';
import { withAuth } from '../withAuth.js';
import { UserId } from '../../../shared/types/index.js';

describe('withAuth', () => {
  describe('Authentication', () => {
    it('should allow resolver execution when userId exists', async () => {
      const mockResolver: GraphQLFieldResolver<any, any, any, string> = vi.fn(
        async (_parent, _args, context) => {
          return `Profile for ${context.userId}`;
        }
      );

      const wrappedResolver = withAuth(mockResolver);

      const result = await wrappedResolver(
        {},
        {},
        { userId: UserId('user-123') },
        {} as any
      );

      expect(result).toBe('Profile for user-123');
      expect(mockResolver).toHaveBeenCalledTimes(1);
    });

    it('should throw UNAUTHENTICATED when userId is undefined', async () => {
      const mockResolver: GraphQLFieldResolver<any, any, any, string> = vi.fn();
      const wrappedResolver = withAuth(mockResolver);

      await expect(
        wrappedResolver({}, {}, { userId: undefined }, {} as any)
      ).rejects.toThrow(GraphQLError);

      await expect(
        wrappedResolver({}, {}, { userId: undefined }, {} as any)
      ).rejects.toThrow('authenticated');

      expect(mockResolver).not.toHaveBeenCalled();
    });

    it('should throw UNAUTHENTICATED when userId is null', async () => {
      const mockResolver: GraphQLFieldResolver<any, any, any, string> = vi.fn();
      const wrappedResolver = withAuth(mockResolver);

      await expect(
        wrappedResolver({}, {}, { userId: null as any }, {} as any)
      ).rejects.toThrow(GraphQLError);

      expect(mockResolver).not.toHaveBeenCalled();
    });

    it('should provide correct error code in extensions', async () => {
      const mockResolver: GraphQLFieldResolver<any, any, any, string> = vi.fn();
      const wrappedResolver = withAuth(mockResolver);

      try {
        await wrappedResolver({}, {}, { userId: undefined }, {} as any);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        const graphQLError = error as GraphQLError;
        expect(graphQLError.extensions.code).toBe('UNAUTHENTICATED');
      }
    });
  });

  describe('Resolver arguments preservation', () => {
    it('should pass all resolver arguments correctly', async () => {
      const mockSource = { id: 'post-1' };
      const mockArgs = { first: 10, after: 'cursor-1' };
      const mockContext = { userId: UserId('user-123') };
      const mockInfo = { fieldName: 'posts' } as any;

      const mockResolver: GraphQLFieldResolver<any, any, any, string> = vi.fn(
        async (source, args, context, info) => {
          expect(source).toBe(mockSource);
          expect(args).toEqual(mockArgs);
          expect(context.userId).toBe('user-123');
          expect(info).toBe(mockInfo);
          return 'success';
        }
      );

      const wrappedResolver = withAuth(mockResolver);

      const result = await wrappedResolver(
        mockSource,
        mockArgs,
        mockContext,
        mockInfo
      );

      expect(result).toBe('success');
      expect(mockResolver).toHaveBeenCalledTimes(1);
    });

    it('should pass GraphQL info correctly', async () => {
      const mockInfo = {
        fieldName: 'me',
        returnType: 'Profile',
        parentType: 'Query',
      } as any;

      const mockResolver: GraphQLFieldResolver<any, any, any, string> = vi.fn(
        async (_parent, _args, _context, info) => {
          expect(info.fieldName).toBe('me');
          return 'success';
        }
      );

      const wrappedResolver = withAuth(mockResolver);

      await wrappedResolver({}, {}, { userId: UserId('user-123') }, mockInfo);

      expect(mockResolver).toHaveBeenCalledWith(
        {},
        {},
        expect.objectContaining({ userId: 'user-123' }),
        mockInfo
      );
    });
  });

  describe('Return type preservation', () => {
    it('should preserve resolver return type', async () => {
      const mockProfile = {
        id: 'user-123',
        handle: '@john',
        fullName: 'John Doe',
      };

      const mockResolver: GraphQLFieldResolver<any, any, any, typeof mockProfile> = vi.fn(
        async () => mockProfile
      );

      const wrappedResolver = withAuth(mockResolver);

      const result = await wrappedResolver(
        {},
        {},
        { userId: UserId('user-123') },
        {} as any
      );

      expect(result).toEqual(mockProfile);
      expect(result.id).toBe('user-123');
      expect(result.handle).toBe('@john');
    });

    it('should handle async resolver functions', async () => {
      const mockResolver: GraphQLFieldResolver<any, any, any, string> = vi.fn(
        async (_parent, _args, context) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return `Async result for ${context.userId}`;
        }
      );

      const wrappedResolver = withAuth(mockResolver);

      const result = await wrappedResolver(
        {},
        {},
        { userId: UserId('user-456') },
        {} as any
      );

      expect(result).toBe('Async result for user-456');
    });
  });

  describe('Error handling', () => {
    it('should propagate resolver errors', async () => {
      const mockError = new Error('Database connection failed');

      const mockResolver: GraphQLFieldResolver<any, any, any, string> = vi.fn(
        async () => {
          throw mockError;
        }
      );

      const wrappedResolver = withAuth(mockResolver);

      await expect(
        wrappedResolver({}, {}, { userId: UserId('user-123') }, {} as any)
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle resolver GraphQL errors', async () => {
      const mockError = new GraphQLError('Not found', {
        extensions: { code: 'NOT_FOUND' },
      });

      const mockResolver: GraphQLFieldResolver<any, any, any, string> = vi.fn(
        async () => {
          throw mockError;
        }
      );

      const wrappedResolver = withAuth(mockResolver);

      await expect(
        wrappedResolver({}, {}, { userId: UserId('user-123') }, {} as any)
      ).rejects.toThrow(mockError);
    });
  });

  describe('Integration', () => {
    it('should work with real-world resolver pattern', async () => {
      interface Profile {
        id: string;
        handle: string;
        fullName: string;
      }

      const mockProfileRepository = {
        findById: vi.fn().mockResolvedValue({
          success: true,
          data: {
            id: 'user-789',
            handle: '@alice',
            fullName: 'Alice Smith',
          },
        }),
      };

      const meResolver: GraphQLFieldResolver<any, any, any, Profile> = async (
        _parent,
        _args,
        context
      ) => {
        const result = await mockProfileRepository.findById(context.userId);
        if (!result.success || !result.data) {
          throw new Error('Profile not found');
        }
        return result.data;
      };

      const wrappedResolver = withAuth(meResolver);

      const result = await wrappedResolver(
        {},
        {},
        { userId: UserId('user-789') },
        {} as any
      );

      expect(result.id).toBe('user-789');
      expect(result.handle).toBe('@alice');
      expect(mockProfileRepository.findById).toHaveBeenCalledWith('user-789');
    });
  });
});
