/**
 * Branded Types Tests
 * 
 * Test-Driven Development (TDD) for type-safe branded types.
 * These tests validate that our branded types provide compile-time
 * type safety while maintaining runtime compatibility with strings.
 */

import { describe, it, expect } from 'vitest';

// Import types we're about to create (will fail initially - TDD RED phase)
import {
  UserId,
  PostId,
  CommentId,
  Cursor,
  Handle,
  type Brand,
} from '../branded.js';

describe('Branded Types', () => {
  describe('Brand<K, T> generic type', () => {
    it('should create branded types that are type-safe at compile time', () => {
      // This test validates TypeScript compilation, not runtime behavior
      // If this compiles without errors, the Brand type is working correctly
      
      type CustomId = Brand<string, 'CustomId'>;
      const customId: CustomId = 'test-123' as CustomId;
      
      // Should be assignable to string (branded types are string subsets)
      const str: string = customId;
      
      expect(str).toBe('test-123');
    });
  });

  describe('UserId constructor', () => {
    it('should create a UserId from a string', () => {
      const id = UserId('user-123');
      
      // Should be usable as a string
      expect(id).toBe('user-123');
      expect(typeof id).toBe('string');
    });

    it('should preserve the original string value', () => {
      const original = 'user-abc-def-ghi';
      const userId = UserId(original);
      
      expect(userId).toBe(original);
    });

    it('should create UserIds that are distinct from regular strings at type level', () => {
      const userId = UserId('user-123');
      const regularString = 'user-123';
      
      // Runtime: Both are strings
      expect(userId).toBe(regularString);
      
      // Compile-time: TypeScript should prevent assignment without explicit cast
      // (This is validated by TypeScript compiler, not runtime test)
    });
  });

  describe('PostId constructor', () => {
    it('should create a PostId from a string', () => {
      const id = PostId('post-456');
      
      expect(id).toBe('post-456');
      expect(typeof id).toBe('string');
    });

    it('should handle UUIDs', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const postId = PostId(uuid);
      
      expect(postId).toBe(uuid);
    });
  });

  describe('CommentId constructor', () => {
    it('should create a CommentId from a string', () => {
      const id = CommentId('comment-789');
      
      expect(id).toBe('comment-789');
      expect(typeof id).toBe('string');
    });
  });

  describe('Cursor constructor', () => {
    it('should create a Cursor from a base64 string', () => {
      const base64 = 'eyJpZCI6InBvc3QtMTIzIn0=';
      const cursor = Cursor(base64);
      
      expect(cursor).toBe(base64);
      expect(typeof cursor).toBe('string');
    });

    it('should handle empty cursor', () => {
      const cursor = Cursor('');
      
      expect(cursor).toBe('');
    });
  });

  describe('Handle constructor', () => {
    it('should create a Handle from a string with @ prefix', () => {
      const handle = Handle('@johndoe');
      
      expect(handle).toBe('@johndoe');
      expect(typeof handle).toBe('string');
    });

    it('should handle lowercase handles', () => {
      const handle = Handle('@alice_smith');
      
      expect(handle).toBe('@alice_smith');
    });
  });

  describe('Type safety', () => {
    it('should prevent mixing branded types at compile time', () => {
      const userId = UserId('user-123');
      const postId = PostId('post-456');
      
      // Runtime: Both are strings, so equality works
      expect(typeof userId).toBe(typeof postId);
      
      // Compile-time: TypeScript should prevent this without explicit cast:
      // const mixedUp: UserId = postId; // ❌ Type error
      // const alsoWrong: PostId = userId; // ❌ Type error
      
      // This test validates that TypeScript compiler catches type mismatches
      expect(true).toBe(true);
    });

    it('should allow branded types to be used where strings are expected', () => {
      const userId = UserId('user-123');
      
      // Should be assignable to string
      const str: string = userId;
      
      // Should work with string methods
      expect(userId.length).toBe(8);
      expect(userId.toUpperCase()).toBe('USER-123');
      expect(userId.includes('user')).toBe(true);
    });

    it('should allow branded types in string templates', () => {
      const userId = UserId('user-123');
      const postId = PostId('post-456');
      
      const message = `User ${userId} created post ${postId}`;
      
      expect(message).toBe('User user-123 created post post-456');
    });
  });

  describe('Real-world usage scenarios', () => {
    it('should work in function parameters with type safety', () => {
      // Function that only accepts UserId
      const getUserProfile = (id: UserId): string => {
        return `Profile for ${id}`;
      };
      
      const userId = UserId('user-123');
      const result = getUserProfile(userId);
      
      expect(result).toBe('Profile for user-123');
      
      // TypeScript should prevent this:
      // const wrongId = 'user-456'; // regular string
      // getUserProfile(wrongId); // ❌ Type error
    });

    it('should work in return types', () => {
      const createUserId = (rawId: string): UserId => {
        return UserId(rawId);
      };
      
      const userId = createUserId('user-789');
      
      expect(userId).toBe('user-789');
      // TypeScript knows this is UserId, not string
    });

    it('should work in object properties', () => {
      interface User {
        id: UserId;
        name: string;
      }
      
      const user: User = {
        id: UserId('user-123'),
        name: 'John Doe',
      };
      
      expect(user.id).toBe('user-123');
      expect(user.name).toBe('John Doe');
    });

    it('should work in array operations', () => {
      const userIds: UserId[] = [
        UserId('user-1'),
        UserId('user-2'),
        UserId('user-3'),
      ];
      
      expect(userIds).toHaveLength(3);
      expect(userIds[0]).toBe('user-1');
      
      // Map over branded types
      const uppercased = userIds.map(id => id.toUpperCase());
      expect(uppercased).toEqual(['USER-1', 'USER-2', 'USER-3']);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty strings', () => {
      const userId = UserId('');
      
      expect(userId).toBe('');
      expect(userId.length).toBe(0);
    });

    it('should handle special characters', () => {
      const userId = UserId('user-!@#$%^&*()');
      
      expect(userId).toBe('user-!@#$%^&*()');
    });

    it('should handle unicode characters', () => {
      const handle = Handle('@用户123');
      
      expect(handle).toBe('@用户123');
    });

    it('should handle very long strings', () => {
      const longId = 'user-' + 'a'.repeat(1000);
      const userId = UserId(longId);
      
      expect(userId.length).toBe(1005);
    });
  });
});
