/**
 * requireAuth Helper Tests
 * TDD: Write tests first to define the API we want
 * 
 * Pattern from SKILL.md: Assertion Functions (Section 3)
 */

import { describe, it, expect } from 'vitest';
import { GraphQLError } from 'graphql';
import { requireAuth, getAuthUserId } from '../requireAuth.js';
import { ERROR_CODES } from '../../types/ErrorCodes.js';

describe('requireAuth', () => {
  describe('when user is authenticated', () => {
    it('should not throw error', () => {
      const context = { userId: 'user-123' };
      
      expect(() => requireAuth(context)).not.toThrow();
    });

    it('should narrow userId type to string', () => {
      const context = { userId: 'user-123' as string | null };
      
      requireAuth(context);
      
      // TypeScript knows context.userId is now string
      const id: string = context.userId;
      expect(id).toBe('user-123');
    });
  });

  describe('when user is not authenticated', () => {
    it('should throw GraphQLError with UNAUTHENTICATED code', () => {
      const context = { userId: null };
      
      expect(() => requireAuth(context)).toThrow(GraphQLError);
      
      try {
        requireAuth(context);
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        expect((error as GraphQLError).extensions.code).toBe(
          ERROR_CODES.UNAUTHENTICATED
        );
      }
    });

    it('should include action in error message', () => {
      const context = { userId: null };
      
      try {
        requireAuth(context, 'view feed');
      } catch (error) {
        expect((error as GraphQLError).message).toContain('view feed');
      }
    });
  });
});

describe('getAuthUserId', () => {
  it('should return userId when authenticated', () => {
    const context = { userId: 'user-123' };
    
    const userId = getAuthUserId(context);
    
    expect(userId).toBe('user-123');
  });

  it('should throw when not authenticated', () => {
    const context = { userId: null };
    
    expect(() => getAuthUserId(context)).toThrow(GraphQLError);
  });

  it('should include action in error message', () => {
    const context = { userId: null };
    
    try {
      getAuthUserId(context, 'access feed');
    } catch (error) {
      expect((error as GraphQLError).message).toContain('access feed');
    }
  });
});
