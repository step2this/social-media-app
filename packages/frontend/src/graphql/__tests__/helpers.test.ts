/**
 * GraphQL Helpers Tests (Extended Safe Helpers)
 *
 * Tests for type guards and safe extraction utilities that handle null/undefined.
 * These extend the existing helpers with null-safety.
 *
 * TDD Pattern: Tests written first (RED), then implementation (GREEN)
 */

import { describe, it, expect } from 'vitest';
import {
  isConnection,
  hasEdges,
  safeUnwrapConnection,
  safeGetPageInfo,
  safeHasNextPage,
  assertConnection,
  // Existing helpers still work:
  unwrapConnection,
  getPageInfo,
  hasNextPage,
  type Connection,
} from '../helpers';

describe('GraphQL Helpers - Extended Safe Utilities', () => {
  // Test data
  const validConnection: Connection<{ id: string }> = {
    edges: [
      { node: { id: '1' }, cursor: 'cursor-1' },
      { node: { id: '2' }, cursor: 'cursor-2' },
    ],
    pageInfo: {
      hasNextPage: true,
      hasPreviousPage: false,
      startCursor: 'cursor-1',
      endCursor: 'cursor-2',
    },
  };

  const emptyConnection: Connection<{ id: string }> = {
    edges: [],
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
  };

  describe('isConnection (type guard)', () => {
    it('should return true for valid connection', () => {
      expect(isConnection(validConnection)).toBe(true);
    });

    it('should return true for empty connection', () => {
      expect(isConnection(emptyConnection)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isConnection(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isConnection(undefined)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isConnection({})).toBe(false);
    });

    it('should return false for object with edges but no pageInfo', () => {
      expect(isConnection({ edges: [] })).toBe(false);
    });

    it('should return false for object with pageInfo but no edges', () => {
      expect(isConnection({ pageInfo: {} })).toBe(false);
    });

    it('should return false for non-array edges', () => {
      expect(isConnection({ edges: 'not-array', pageInfo: {} })).toBe(false);
    });
  });

  describe('hasEdges', () => {
    it('should return true for connection with edges', () => {
      expect(hasEdges(validConnection)).toBe(true);
    });

    it('should return false for empty connection', () => {
      expect(hasEdges(emptyConnection)).toBe(false);
    });

    it('should return false for null', () => {
      expect(hasEdges(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(hasEdges(undefined)).toBe(false);
    });
  });

  describe('safeUnwrapConnection', () => {
    it('should unwrap valid connection using existing unwrapConnection', () => {
      const result = safeUnwrapConnection(validConnection);

      expect(result).toEqual([{ id: '1' }, { id: '2' }]);
      // Should give same result as existing helper:
      expect(result).toEqual(unwrapConnection(validConnection));
    });

    it('should return empty array for null', () => {
      expect(safeUnwrapConnection(null)).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      expect(safeUnwrapConnection(undefined)).toEqual([]);
    });

    it('should return empty array for empty connection', () => {
      expect(safeUnwrapConnection(emptyConnection)).toEqual([]);
    });

    it('should return empty array for invalid structure', () => {
      expect(safeUnwrapConnection({} as any)).toEqual([]);
    });

    it('should return empty array when edges is not an array', () => {
      expect(safeUnwrapConnection({ edges: 'not-array', pageInfo: {} } as any)).toEqual([]);
    });
  });

  describe('safeGetPageInfo', () => {
    it('should get pageInfo from valid connection using existing helper', () => {
      const result = safeGetPageInfo(validConnection);

      expect(result).toEqual({
        hasNextPage: true,
        hasPreviousPage: false,
        startCursor: 'cursor-1',
        endCursor: 'cursor-2',
      });
      // Should give same result as existing helper:
      expect(result).toEqual(getPageInfo(validConnection));
    });

    it('should return defaults for null', () => {
      const result = safeGetPageInfo(null);

      expect(result).toEqual({
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      });
    });

    it('should return defaults for undefined', () => {
      const result = safeGetPageInfo(undefined);

      expect(result).toEqual({
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      });
    });

    it('should return defaults for invalid structure', () => {
      const result = safeGetPageInfo({} as any);

      expect(result).toEqual({
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      });
    });
  });

  describe('safeHasNextPage', () => {
    it('should return true for connection with next page', () => {
      expect(safeHasNextPage(validConnection)).toBe(true);
      // Same as existing helper:
      expect(safeHasNextPage(validConnection)).toBe(hasNextPage(validConnection));
    });

    it('should return false for connection without next page', () => {
      expect(safeHasNextPage(emptyConnection)).toBe(false);
    });

    it('should return false for null', () => {
      expect(safeHasNextPage(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(safeHasNextPage(undefined)).toBe(false);
    });

    it('should return false for invalid structure', () => {
      expect(safeHasNextPage({} as any)).toBe(false);
    });
  });

  describe('assertConnection', () => {
    it('should not throw for valid connection', () => {
      expect(() => {
        assertConnection(validConnection, 'auctions');
      }).not.toThrow();
    });

    it('should not throw for empty connection', () => {
      expect(() => {
        assertConnection(emptyConnection, 'auctions');
      }).not.toThrow();
    });

    it('should throw for null', () => {
      expect(() => {
        assertConnection(null, 'auctions');
      }).toThrow('GraphQL response missing or invalid connection: auctions');
    });

    it('should throw for undefined', () => {
      expect(() => {
        assertConnection(undefined, 'auctions');
      }).toThrow('GraphQL response missing or invalid connection: auctions');
    });

    it('should throw for invalid structure', () => {
      expect(() => {
        assertConnection({}, 'auctions');
      }).toThrow('GraphQL response missing or invalid connection: auctions');
    });

    it('should use default field name when not provided', () => {
      expect(() => {
        assertConnection(null);
      }).toThrow('GraphQL response missing or invalid connection: connection');
    });

    it('should narrow type after assertion', () => {
      const data: unknown = validConnection;

      assertConnection(data, 'test');
      // TypeScript now knows data is Connection<unknown>
      const nodes = unwrapConnection(data);

      expect(Array.isArray(nodes)).toBe(true);
    });
  });

  describe('Existing helpers still work unchanged', () => {
    it('unwrapConnection still works with valid connection', () => {
      const result = unwrapConnection(validConnection);
      expect(result).toEqual([{ id: '1' }, { id: '2' }]);
    });

    it('getPageInfo still works with valid connection', () => {
      const result = getPageInfo(validConnection);
      expect(result.hasNextPage).toBe(true);
    });

    it('hasNextPage still works with valid connection', () => {
      expect(hasNextPage(validConnection)).toBe(true);
      expect(hasNextPage(emptyConnection)).toBe(false);
    });
  });
});
