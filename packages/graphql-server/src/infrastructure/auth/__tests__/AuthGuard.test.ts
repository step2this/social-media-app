/**
 * AuthGuard Tests
 *
 * Test-Driven Development (TDD) for authentication guard.
 * The AuthGuard enforces authentication requirements for resolvers.
 *
 * This replaces duplicate authentication checks scattered across resolvers:
 * - Before: if (!context.userId) throw new GraphQLError(...)
 * - After: const authResult = authGuard.requireAuth(context)
 */

import { describe, it, expect } from 'vitest';

// Import types and classes we're about to create (will fail initially - TDD RED phase)
import { AuthGuard } from '../AuthGuard.js';
import { UserId } from '../../../shared/types/index.js';

describe('AuthGuard', () => {
  describe('Constructor', () => {
    it('should create AuthGuard instance', () => {
      const authGuard = new AuthGuard();

      expect(authGuard).toBeInstanceOf(AuthGuard);
    });
  });

  describe('requireAuth()', () => {
    it('should return success with userId when authenticated', () => {
      const authGuard = new AuthGuard();
      const context = { userId: UserId('user-123') };

      const result = authGuard.requireAuth(context);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('user-123');
      }
    });

    it('should return error when userId is undefined', () => {
      const authGuard = new AuthGuard();
      const context = { userId: undefined };

      const result = authGuard.requireAuth(context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain('authenticated');
      }
    });

    it('should have descriptive error message', () => {
      const authGuard = new AuthGuard();
      const context = { userId: undefined };

      const result = authGuard.requireAuth(context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toMatch(/must be authenticated|authentication required/i);
      }
    });

    it('should work with different userId values', () => {
      const authGuard = new AuthGuard();

      const testCases = [
        UserId('user-1'),
        UserId('user-abc-def-123'),
        UserId('550e8400-e29b-41d4-a716-446655440000'), // UUID
      ];

      testCases.forEach((userId) => {
        const result = authGuard.requireAuth({ userId });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(userId);
        }
      });
    });

    it('should return Result type for type-safe error handling', () => {
      const authGuard = new AuthGuard();
      const context = { userId: UserId('user-123') };

      const result = authGuard.requireAuth(context);

      // Result type forces explicit success/failure handling
      if (result.success) {
        const userId: UserId = result.data;
        expect(userId).toBe('user-123');
      } else {
        const error: Error = result.error;
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('optionalAuth()', () => {
    it('should return userId when authenticated', () => {
      const authGuard = new AuthGuard();
      const context = { userId: UserId('user-123') };

      const userId = authGuard.optionalAuth(context);

      expect(userId).toBe('user-123');
    });

    it('should return null when not authenticated', () => {
      const authGuard = new AuthGuard();
      const context = { userId: undefined };

      const userId = authGuard.optionalAuth(context);

      expect(userId).toBe(null);
    });

    it('should work for public resolvers with optional auth', () => {
      const authGuard = new AuthGuard();

      // Authenticated user
      const authenticatedContext = { userId: UserId('user-123') };
      const authenticatedResult = authGuard.optionalAuth(authenticatedContext);
      expect(authenticatedResult).toBe('user-123');

      // Anonymous user
      const anonymousContext = { userId: undefined };
      const anonymousResult = authGuard.optionalAuth(anonymousContext);
      expect(anonymousResult).toBe(null);
    });

    it('should handle different userId values', () => {
      const authGuard = new AuthGuard();

      const testCases = [
        UserId('user-1'),
        UserId('admin-user'),
        UserId('550e8400-e29b-41d4-a716-446655440000'),
      ];

      testCases.forEach((userId) => {
        const result = authGuard.optionalAuth({ userId });
        expect(result).toBe(userId);
      });
    });
  });

  describe('Real-world resolver scenarios', () => {
    it('should protect authenticated-only resolver', () => {
      const authGuard = new AuthGuard();

      // Simulate GraphQL resolver context
      const authenticatedContext = { userId: UserId('user-123') };
      const unauthenticatedContext = { userId: undefined };

      // Authenticated user can access
      const authResult = authGuard.requireAuth(authenticatedContext);
      expect(authResult.success).toBe(true);

      // Unauthenticated user blocked
      const unauthResult = authGuard.requireAuth(unauthenticatedContext);
      expect(unauthResult.success).toBe(false);
    });

    it('should allow public resolver with optional auth', () => {
      const authGuard = new AuthGuard();

      // Public resolver (e.g., view post)
      const authenticatedUserId = authGuard.optionalAuth({ userId: UserId('user-123') });
      const anonymousUserId = authGuard.optionalAuth({ userId: undefined });

      // Both can access, but with different user IDs
      expect(authenticatedUserId).toBe('user-123');
      expect(anonymousUserId).toBe(null);
    });

    it('should integrate with resolver flow', () => {
      const authGuard = new AuthGuard();

      // Simulate GraphQL resolver for "me" query
      const meResolver = (context: { userId?: UserId }) => {
        const authResult = authGuard.requireAuth(context);

        if (!authResult.success) {
          return { error: authResult.error.message };
        }

        // TypeScript knows authResult.data is UserId
        const userId: UserId = authResult.data;
        return { userId, profile: { name: 'John Doe' } };
      };

      // Authenticated request
      const authResult = meResolver({ userId: UserId('user-123') });
      expect(authResult).toEqual({
        userId: 'user-123',
        profile: { name: 'John Doe' },
      });

      // Unauthenticated request
      const unauthResult = meResolver({ userId: undefined });
      expect(unauthResult).toHaveProperty('error');
      expect((unauthResult as any).error).toContain('authenticated');
    });

    it('should integrate with public resolver that personalizes for authenticated users', () => {
      const authGuard = new AuthGuard();

      // Simulate public feed that shows "isLiked" for authenticated users
      const feedResolver = (context: { userId?: UserId }) => {
        const userId = authGuard.optionalAuth(context);

        const posts = [
          { id: 'post-1', title: 'Post 1', isLiked: userId ? true : null },
          { id: 'post-2', title: 'Post 2', isLiked: userId ? false : null },
        ];

        return { posts, viewerId: userId };
      };

      // Authenticated user sees personalized feed
      const authFeed = feedResolver({ userId: UserId('user-123') });
      expect(authFeed.viewerId).toBe('user-123');
      expect(authFeed.posts[0].isLiked).toBe(true);

      // Anonymous user sees non-personalized feed
      const publicFeed = feedResolver({ userId: undefined });
      expect(publicFeed.viewerId).toBe(null);
      expect(publicFeed.posts[0].isLiked).toBe(null);
    });
  });

  describe('Error handling', () => {
    it('should create Error instances for failures', () => {
      const authGuard = new AuthGuard();
      const context = { userId: undefined };

      const result = authGuard.requireAuth(context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.name).toBe('Error');
      }
    });

    it('should have consistent error format', () => {
      const authGuard = new AuthGuard();

      const result1 = authGuard.requireAuth({ userId: undefined });
      const result2 = authGuard.requireAuth({ userId: undefined });

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);

      if (!result1.success && !result2.success) {
        expect(result1.error.message).toBe(result2.error.message);
      }
    });
  });

  describe('Type safety', () => {
    it('should work with AuthContext interface', () => {
      interface AuthContext {
        userId?: UserId;
        // Other context fields...
      }

      const authGuard = new AuthGuard();
      const context: AuthContext = { userId: UserId('user-123') };

      const result = authGuard.requireAuth(context);

      expect(result.success).toBe(true);
    });

    it('should narrow types with requireAuth', () => {
      const authGuard = new AuthGuard();
      const context = { userId: UserId('user-123') as UserId | undefined };

      const result = authGuard.requireAuth(context);

      if (result.success) {
        // TypeScript knows result.data is UserId (not undefined)
        const userId: UserId = result.data;
        expect(userId).toBe('user-123');
      }
    });

    it('should work with generic context types', () => {
      interface GraphQLContext {
        userId?: UserId;
        dataloaders: Record<string, unknown>;
        services: Record<string, unknown>;
      }

      const authGuard = new AuthGuard();
      const context: GraphQLContext = {
        userId: UserId('user-123'),
        dataloaders: {},
        services: {},
      };

      const result = authGuard.requireAuth(context);
      expect(result.success).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string userId as unauthenticated', () => {
      const authGuard = new AuthGuard();
      // Empty string is technically a valid UserId type, but empty strings are falsy in JavaScript
      const context = { userId: UserId('') };

      // Business logic: empty string is falsy, so treated as not authenticated
      // This matches JavaScript's truthiness semantics
      const result = authGuard.requireAuth(context);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('authenticated');
      }
    });

    it('should be stateless (no side effects)', () => {
      const authGuard = new AuthGuard();
      const context1 = { userId: UserId('user-1') };
      const context2 = { userId: undefined };

      // Multiple calls should not affect each other
      const result1a = authGuard.requireAuth(context1);
      const result2a = authGuard.requireAuth(context2);
      const result1b = authGuard.requireAuth(context1);
      const result2b = authGuard.requireAuth(context2);

      expect(result1a.success).toBe(true);
      expect(result2a.success).toBe(false);
      expect(result1b.success).toBe(true);
      expect(result2b.success).toBe(false);
    });

    it('should handle rapid sequential calls', () => {
      const authGuard = new AuthGuard();
      const context = { userId: UserId('user-123') };

      // Simulate rapid resolver calls
      const results = Array.from({ length: 100 }, () =>
        authGuard.requireAuth(context)
      );

      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });

    it('should work with multiple AuthGuard instances', () => {
      const authGuard1 = new AuthGuard();
      const authGuard2 = new AuthGuard();

      const context = { userId: UserId('user-123') };

      const result1 = authGuard1.requireAuth(context);
      const result2 = authGuard2.requireAuth(context);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle many authentication checks efficiently', () => {
      const authGuard = new AuthGuard();
      const context = { userId: UserId('user-123') };

      const startTime = Date.now();

      // Perform 10,000 auth checks
      for (let i = 0; i < 10000; i++) {
        authGuard.requireAuth(context);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in less than 100ms (very generous threshold)
      expect(duration).toBeLessThan(100);
    });
  });
});
