/**
 * CursorCodec Tests
 *
 * Test-Driven Development (TDD) for cursor encoding/decoding.
 * The CursorCodec handles opaque cursor generation for Relay pagination.
 *
 * Cursors are base64-encoded JSON containing { id, sortKey }.
 * This keeps cursor implementation details hidden from clients.
 */

import { describe, it, expect } from 'vitest';

// Import types and classes we're about to create (will fail initially - TDD RED phase)
import { CursorCodec, ICursorCodec } from '../CursorCodec.js';
import { Cursor, CursorData } from '../../../shared/types/index.js';

describe('CursorCodec', () => {
  describe('ICursorCodec interface', () => {
    it('should define encode and decode methods', () => {
      const codec: ICursorCodec = new CursorCodec();

      expect(codec.encode).toBeDefined();
      expect(codec.decode).toBeDefined();
      expect(typeof codec.encode).toBe('function');
      expect(typeof codec.decode).toBe('function');
    });
  });

  describe('encode()', () => {
    it('should encode cursor data to base64', () => {
      const codec = new CursorCodec();
      const cursorData: CursorData<string> = {
        id: 'post-123',
        sortKey: '2024-01-01T00:00:00Z',
      };

      const cursor = codec.encode(cursorData);

      expect(cursor).toBeTruthy();
      expect(typeof cursor).toBe('string');
      // Cursor should be base64 (alphanumeric + / + =)
      expect(cursor).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it('should produce deterministic output', () => {
      const codec = new CursorCodec();
      const cursorData: CursorData<string> = {
        id: 'post-123',
        sortKey: '2024-01-01',
      };

      const cursor1 = codec.encode(cursorData);
      const cursor2 = codec.encode(cursorData);

      expect(cursor1).toBe(cursor2);
    });

    it('should handle number sortKey', () => {
      const codec = new CursorCodec();
      const cursorData: CursorData<number> = {
        id: 'item-456',
        sortKey: 1234567890,
      };

      const cursor = codec.encode(cursorData);

      expect(cursor).toBeTruthy();
      expect(cursor).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it('should handle complex sortKey', () => {
      const codec = new CursorCodec();
      const cursorData: CursorData<{ priority: number; timestamp: string }> = {
        id: 'task-789',
        sortKey: {
          priority: 1,
          timestamp: '2024-01-01T00:00:00Z',
        },
      };

      const cursor = codec.encode(cursorData);

      expect(cursor).toBeTruthy();
      expect(cursor).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it('should encode different data to different cursors', () => {
      const codec = new CursorCodec();
      const cursor1 = codec.encode({ id: 'post-1', sortKey: '2024-01-01' });
      const cursor2 = codec.encode({ id: 'post-2', sortKey: '2024-01-02' });

      expect(cursor1).not.toBe(cursor2);
    });

    it('should handle empty string values', () => {
      const codec = new CursorCodec();
      const cursorData: CursorData<string> = {
        id: '',
        sortKey: '',
      };

      const cursor = codec.encode(cursorData);

      expect(cursor).toBeTruthy();
    });

    it('should handle special characters in values', () => {
      const codec = new CursorCodec();
      const cursorData: CursorData<string> = {
        id: 'post-!@#$%',
        sortKey: 'key-&*()_+',
      };

      const cursor = codec.encode(cursorData);

      expect(cursor).toBeTruthy();
      expect(cursor).toMatch(/^[A-Za-z0-9+/=]+$/);
    });
  });

  describe('decode()', () => {
    it('should decode cursor back to original data', () => {
      const codec = new CursorCodec();
      const original: CursorData<string> = {
        id: 'post-123',
        sortKey: '2024-01-01T00:00:00Z',
      };

      const cursor = codec.encode(original);
      const result = codec.decode<string>(cursor);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(original.id);
        expect(result.data.sortKey).toBe(original.sortKey);
      }
    });

    it('should preserve number sortKey', () => {
      const codec = new CursorCodec();
      const original: CursorData<number> = {
        id: 'item-456',
        sortKey: 9876543210,
      };

      const cursor = codec.encode(original);
      const result = codec.decode<number>(cursor);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortKey).toBe(9876543210);
      }
    });

    it('should preserve complex sortKey', () => {
      const codec = new CursorCodec();
      const original: CursorData<{ a: number; b: string }> = {
        id: 'complex-1',
        sortKey: { a: 42, b: 'test' },
      };

      const cursor = codec.encode(original);
      const result = codec.decode<{ a: number; b: string }>(cursor);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortKey.a).toBe(42);
        expect(result.data.sortKey.b).toBe('test');
      }
    });

    it('should return error for invalid base64', () => {
      const codec = new CursorCodec();
      const invalidCursor = Cursor('not-valid-base64!!!');

      const result = codec.decode(invalidCursor);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain('Invalid cursor');
      }
    });

    it('should return error for non-JSON base64', () => {
      const codec = new CursorCodec();
      // Valid base64 but not JSON
      const invalidCursor = Cursor(Buffer.from('not json').toString('base64'));

      const result = codec.decode(invalidCursor);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    it('should return error for empty cursor', () => {
      const codec = new CursorCodec();
      const emptyCursor = Cursor('');

      const result = codec.decode(emptyCursor);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    it('should return error for malformed JSON', () => {
      const codec = new CursorCodec();
      // Valid base64 encoding of malformed JSON
      const malformedCursor = Cursor(Buffer.from('{invalid}').toString('base64'));

      const result = codec.decode(malformedCursor);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });
  });

  describe('encode/decode round trip', () => {
    it('should maintain data integrity for string sortKey', () => {
      const codec = new CursorCodec();
      const testCases: CursorData<string>[] = [
        { id: 'post-1', sortKey: '2024-01-01' },
        { id: 'post-2', sortKey: '2024-12-31T23:59:59Z' },
        { id: 'user-123', sortKey: 'alpha-beta-gamma' },
      ];

      testCases.forEach((original) => {
        const cursor = codec.encode(original);
        const result = codec.decode<string>(cursor);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(original);
        }
      });
    });

    it('should maintain data integrity for number sortKey', () => {
      const codec = new CursorCodec();
      const testCases: CursorData<number>[] = [
        { id: 'item-1', sortKey: 0 },
        { id: 'item-2', sortKey: -100 },
        { id: 'item-3', sortKey: 999999999 },
        { id: 'item-4', sortKey: 3.14159 },
      ];

      testCases.forEach((original) => {
        const cursor = codec.encode(original);
        const result = codec.decode<number>(cursor);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(original);
        }
      });
    });

    it('should maintain data integrity for complex sortKey', () => {
      const codec = new CursorCodec();
      const original: CursorData<{ priority: number; timestamp: string; tags: string[] }> = {
        id: 'complex-123',
        sortKey: {
          priority: 1,
          timestamp: '2024-01-01T00:00:00Z',
          tags: ['urgent', 'important'],
        },
      };

      const cursor = codec.encode(original);
      const result = codec.decode<{ priority: number; timestamp: string; tags: string[] }>(cursor);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(original);
        expect(result.data.sortKey.tags).toEqual(['urgent', 'important']);
      }
    });
  });

  describe('Real-world pagination scenarios', () => {
    it('should encode/decode time-based feed cursor', () => {
      const codec = new CursorCodec();
      const feedItem: CursorData<string> = {
        id: 'post-abc-123',
        sortKey: '2024-01-15T14:30:00.000Z',
      };

      const cursor = codec.encode(feedItem);
      const result = codec.decode<string>(cursor);

      expect(result.success).toBe(true);
      if (result.success) {
        // Can use decoded values to fetch next page
        expect(result.data.id).toBe('post-abc-123');
        expect(result.data.sortKey).toBe('2024-01-15T14:30:00.000Z');
      }
    });

    it('should encode/decode score-based ranking cursor', () => {
      const codec = new CursorCodec();
      const rankedItem: CursorData<number> = {
        id: 'item-xyz-456',
        sortKey: 0.9876, // Relevance score
      };

      const cursor = codec.encode(rankedItem);
      const result = codec.decode<number>(cursor);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortKey).toBe(0.9876);
      }
    });

    it('should encode/decode composite sort key cursor', () => {
      const codec = new CursorCodec();
      const compositeItem: CursorData<{ category: string; createdAt: string; score: number }> = {
        id: 'multi-sort-789',
        sortKey: {
          category: 'technology',
          createdAt: '2024-01-01T00:00:00Z',
          score: 95,
        },
      };

      const cursor = codec.encode(compositeItem);
      const result = codec.decode<{ category: string; createdAt: string; score: number }>(cursor);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortKey.category).toBe('technology');
        expect(result.data.sortKey.createdAt).toBe('2024-01-01T00:00:00Z');
        expect(result.data.sortKey.score).toBe(95);
      }
    });

    it('should handle cursor from external/legacy systems', () => {
      const codec = new CursorCodec();
      // Simulate cursor from another system
      const externalCursor = Cursor(
        Buffer.from(JSON.stringify({ id: 'external-1', sortKey: 'timestamp' })).toString('base64')
      );

      const result = codec.decode<string>(externalCursor);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('external-1');
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle very long IDs', () => {
      const codec = new CursorCodec();
      const longId = 'post-' + 'a'.repeat(1000);
      const cursorData: CursorData<string> = {
        id: longId,
        sortKey: '2024-01-01',
      };

      const cursor = codec.encode(cursorData);
      const result = codec.decode<string>(cursor);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(longId);
      }
    });

    it('should handle unicode characters', () => {
      const codec = new CursorCodec();
      const cursorData: CursorData<string> = {
        id: 'post-测试-123',
        sortKey: 'sortKey-日本語',
      };

      const cursor = codec.encode(cursorData);
      const result = codec.decode<string>(cursor);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('post-测试-123');
        expect(result.data.sortKey).toBe('sortKey-日本語');
      }
    });

    it('should handle null values gracefully (type allows it)', () => {
      const codec = new CursorCodec();
      const cursorData = {
        id: 'null-test',
        sortKey: null,
      };

      const cursor = codec.encode(cursorData as any);
      const result = codec.decode(cursor);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortKey).toBe(null);
      }
    });

    it('should return meaningful error messages', () => {
      const codec = new CursorCodec();
      const invalidCursor = Cursor('!!!invalid!!!');

      const result = codec.decode(invalidCursor);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBeTruthy();
        expect(result.error.message.length).toBeGreaterThan(0);
      }
    });

    it('should be stateless (no side effects)', () => {
      const codec = new CursorCodec();
      const cursorData: CursorData<string> = {
        id: 'stateless-test',
        sortKey: '2024-01-01',
      };

      // Multiple operations should not affect each other
      const cursor1 = codec.encode(cursorData);
      const cursor2 = codec.encode(cursorData);
      const result1 = codec.decode<string>(cursor1);
      const result2 = codec.decode<string>(cursor2);

      expect(cursor1).toBe(cursor2);
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('Type safety', () => {
    it('should enforce CursorData structure at compile time', () => {
      const codec = new CursorCodec();

      // This should compile (valid CursorData)
      const validData: CursorData<string> = {
        id: 'test',
        sortKey: 'key',
      };
      const cursor = codec.encode(validData);

      expect(cursor).toBeTruthy();

      // TypeScript should prevent this (missing fields):
      // const invalidData = { id: 'test' }; // Missing sortKey
      // codec.encode(invalidData); // Compile error
    });

    it('should maintain type information through encode/decode', () => {
      const codec = new CursorCodec();
      const original: CursorData<{ value: number }> = {
        id: 'typed-1',
        sortKey: { value: 42 },
      };

      const cursor = codec.encode(original);
      const result = codec.decode<{ value: number }>(cursor);

      expect(result.success).toBe(true);
      if (result.success) {
        // TypeScript knows result.data.sortKey is { value: number }
        const value: number = result.data.sortKey.value;
        expect(value).toBe(42);
      }
    });
  });
});
