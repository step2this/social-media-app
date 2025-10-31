/**
 * Pagination Types Tests
 * 
 * Test-Driven Development (TDD) for Relay-style cursor pagination types.
 * These types follow the Relay Cursor Connections Specification.
 * 
 * @see https://relay.dev/graphql/connections.htm
 */

import { describe, it, expect } from 'vitest';

// Import types we're about to create (will fail initially - TDD RED phase)
import {
  PageInfo,
  Edge,
  Connection,
  PaginationArgs,
  CursorData,
} from '../pagination.js';
import { Cursor } from '../branded.js';

describe('Pagination Types', () => {
  describe('PageInfo', () => {
    it('should define page info structure', () => {
      const pageInfo: PageInfo = {
        hasNextPage: true,
        hasPreviousPage: false,
        startCursor: Cursor('start'),
        endCursor: Cursor('end'),
      };

      expect(pageInfo.hasNextPage).toBe(true);
      expect(pageInfo.hasPreviousPage).toBe(false);
      expect(pageInfo.startCursor).toBe('start');
      expect(pageInfo.endCursor).toBe('end');
    });

    it('should allow null cursors', () => {
      const pageInfo: PageInfo = {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      };

      expect(pageInfo.startCursor).toBe(null);
      expect(pageInfo.endCursor).toBe(null);
    });

    it('should represent empty result set', () => {
      const emptyPageInfo: PageInfo = {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      };

      expect(emptyPageInfo.hasNextPage).toBe(false);
      expect(emptyPageInfo.startCursor).toBe(null);
    });

    it('should represent first page with more pages', () => {
      const firstPage: PageInfo = {
        hasNextPage: true,
        hasPreviousPage: false,
        startCursor: Cursor('cursor-1'),
        endCursor: Cursor('cursor-10'),
      };

      expect(firstPage.hasNextPage).toBe(true);
      expect(firstPage.hasPreviousPage).toBe(false);
    });

    it('should represent middle page', () => {
      const middlePage: PageInfo = {
        hasNextPage: true,
        hasPreviousPage: true,
        startCursor: Cursor('cursor-11'),
        endCursor: Cursor('cursor-20'),
      };

      expect(middlePage.hasNextPage).toBe(true);
      expect(middlePage.hasPreviousPage).toBe(true);
    });

    it('should represent last page', () => {
      const lastPage: PageInfo = {
        hasNextPage: false,
        hasPreviousPage: true,
        startCursor: Cursor('cursor-91'),
        endCursor: Cursor('cursor-100'),
      };

      expect(lastPage.hasNextPage).toBe(false);
      expect(lastPage.hasPreviousPage).toBe(true);
    });
  });

  describe('Edge<T>', () => {
    it('should define edge structure', () => {
      interface Post {
        id: string;
        title: string;
      }

      const edge: Edge<Post> = {
        node: { id: 'post-1', title: 'Test Post' },
        cursor: Cursor('cursor-1'),
      };

      expect(edge.node.id).toBe('post-1');
      expect(edge.node.title).toBe('Test Post');
      expect(edge.cursor).toBe('cursor-1');
    });

    it('should work with primitive types', () => {
      const numberEdge: Edge<number> = {
        node: 42,
        cursor: Cursor('cursor-42'),
      };

      const stringEdge: Edge<string> = {
        node: 'hello',
        cursor: Cursor('cursor-hello'),
      };

      expect(numberEdge.node).toBe(42);
      expect(stringEdge.node).toBe('hello');
    });

    it('should work with complex nested types', () => {
      interface User {
        id: string;
        profile: {
          name: string;
          email: string;
        };
      }

      const edge: Edge<User> = {
        node: {
          id: 'user-1',
          profile: {
            name: 'John',
            email: 'john@example.com',
          },
        },
        cursor: Cursor('cursor-user-1'),
      };

      expect(edge.node.profile.name).toBe('John');
      expect(edge.node.profile.email).toBe('john@example.com');
    });
  });

  describe('Connection<T>', () => {
    it('should define connection structure', () => {
      interface Post {
        id: string;
        title: string;
      }

      const connection: Connection<Post> = {
        edges: [
          {
            node: { id: 'post-1', title: 'First Post' },
            cursor: Cursor('cursor-1'),
          },
          {
            node: { id: 'post-2', title: 'Second Post' },
            cursor: Cursor('cursor-2'),
          },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: Cursor('cursor-1'),
          endCursor: Cursor('cursor-2'),
        },
      };

      expect(connection.edges).toHaveLength(2);
      expect(connection.edges[0].node.title).toBe('First Post');
      expect(connection.pageInfo.hasNextPage).toBe(true);
    });

    it('should represent empty connection', () => {
      const emptyConnection: Connection<string> = {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      };

      expect(emptyConnection.edges).toHaveLength(0);
      expect(emptyConnection.pageInfo.startCursor).toBe(null);
    });

    it('should work with generic types', () => {
      const numberConnection: Connection<number> = {
        edges: [
          { node: 1, cursor: Cursor('1') },
          { node: 2, cursor: Cursor('2') },
          { node: 3, cursor: Cursor('3') },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: Cursor('1'),
          endCursor: Cursor('3'),
        },
      };

      expect(numberConnection.edges).toHaveLength(3);
      expect(numberConnection.edges[1].node).toBe(2);
    });
  });

  describe('PaginationArgs', () => {
    it('should define forward pagination args', () => {
      const args: PaginationArgs = {
        first: 10,
        after: Cursor('cursor-10'),
      };

      expect(args.first).toBe(10);
      expect(args.after).toBe('cursor-10');
    });

    it('should define backward pagination args', () => {
      const args: PaginationArgs = {
        last: 10,
        before: Cursor('cursor-20'),
      };

      expect(args.last).toBe(10);
      expect(args.before).toBe('cursor-20');
    });

    it('should allow optional fields', () => {
      const minimal: PaginationArgs = {};

      expect(minimal.first).toBeUndefined();
      expect(minimal.after).toBeUndefined();
      expect(minimal.last).toBeUndefined();
      expect(minimal.before).toBeUndefined();
    });

    it('should support first-only pagination', () => {
      const args: PaginationArgs = {
        first: 20,
      };

      expect(args.first).toBe(20);
      expect(args.after).toBeUndefined();
    });
  });

  describe('CursorData<T>', () => {
    it('should define cursor data structure', () => {
      const cursorData: CursorData<string> = {
        id: 'post-123',
        sortKey: '2024-01-01T00:00:00Z',
      };

      expect(cursorData.id).toBe('post-123');
      expect(cursorData.sortKey).toBe('2024-01-01T00:00:00Z');
    });

    it('should work with number sortKey', () => {
      const cursorData: CursorData<number> = {
        id: 'item-456',
        sortKey: 1234567890,
      };

      expect(cursorData.sortKey).toBe(1234567890);
    });

    it('should work with complex sortKey', () => {
      const cursorData: CursorData<{ createdAt: string; priority: number }> = {
        id: 'task-789',
        sortKey: {
          createdAt: '2024-01-01T00:00:00Z',
          priority: 1,
        },
      };

      expect(cursorData.sortKey.createdAt).toBe('2024-01-01T00:00:00Z');
      expect(cursorData.sortKey.priority).toBe(1);
    });

    it('should allow unknown sortKey type', () => {
      const cursorData: CursorData = {
        id: 'generic-123',
        sortKey: 'any-value',
      };

      expect(cursorData.id).toBe('generic-123');
      expect(cursorData.sortKey).toBe('any-value');
    });
  });

  describe('Real-world pagination scenarios', () => {
    it('should handle initial page load', () => {
      interface Post {
        id: string;
        title: string;
      }

      // User requests first 10 posts
      const args: PaginationArgs = { first: 10 };

      // Simulate result from database
      const connection: Connection<Post> = {
        edges: [
          { node: { id: '1', title: 'Post 1' }, cursor: Cursor('c1') },
          { node: { id: '2', title: 'Post 2' }, cursor: Cursor('c2') },
          // ... 10 posts total
        ],
        pageInfo: {
          hasNextPage: true, // More posts available
          hasPreviousPage: false, // First page
          startCursor: Cursor('c1'),
          endCursor: Cursor('c2'),
        },
      };

      expect(args.first).toBe(10);
      expect(connection.pageInfo.hasNextPage).toBe(true);
      expect(connection.pageInfo.hasPreviousPage).toBe(false);
    });

    it('should handle loading next page', () => {
      // User clicks "Load More" with last cursor from previous page
      const args: PaginationArgs = {
        first: 10,
        after: Cursor('cursor-10'), // Last cursor from previous page
      };

      expect(args.first).toBe(10);
      expect(args.after).toBe('cursor-10');
    });

    it('should handle infinite scroll', () => {
      interface FeedItem {
        id: string;
        content: string;
      }

      // Accumulate edges from multiple pages
      const page1: Connection<FeedItem> = {
        edges: [
          { node: { id: '1', content: 'Item 1' }, cursor: Cursor('c1') },
          { node: { id: '2', content: 'Item 2' }, cursor: Cursor('c2') },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: Cursor('c1'),
          endCursor: Cursor('c2'),
        },
      };

      const page2: Connection<FeedItem> = {
        edges: [
          { node: { id: '3', content: 'Item 3' }, cursor: Cursor('c3') },
          { node: { id: '4', content: 'Item 4' }, cursor: Cursor('c4') },
        ],
        pageInfo: {
          hasNextPage: false, // No more pages
          hasPreviousPage: true,
          startCursor: Cursor('c3'),
          endCursor: Cursor('c4'),
        },
      };

      // Combine edges from both pages
      const allEdges = [...page1.edges, ...page2.edges];

      expect(allEdges).toHaveLength(4);
      expect(page2.pageInfo.hasNextPage).toBe(false);
    });

    it('should handle time-based cursor pagination', () => {
      const cursorData: CursorData<string> = {
        id: 'post-123',
        sortKey: '2024-01-01T12:00:00Z', // ISO timestamp
      };

      // Encode cursor for pagination
      const encodedCursor = Cursor(
        Buffer.from(JSON.stringify(cursorData)).toString('base64')
      );

      expect(encodedCursor).toBeTruthy();

      // Decode cursor on server
      const decoded = JSON.parse(
        Buffer.from(encodedCursor, 'base64').toString('utf-8')
      );

      expect(decoded.id).toBe('post-123');
      expect(decoded.sortKey).toBe('2024-01-01T12:00:00Z');
    });
  });

  describe('Edge cases', () => {
    it('should handle single-item connection', () => {
      const connection: Connection<string> = {
        edges: [{ node: 'only-item', cursor: Cursor('c1') }],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: Cursor('c1'),
          endCursor: Cursor('c1'), // Same as start
        },
      };

      expect(connection.edges).toHaveLength(1);
      expect(connection.pageInfo.startCursor).toBe(connection.pageInfo.endCursor);
    });

    it('should handle null nodes gracefully', () => {
      const connection: Connection<string | null> = {
        edges: [
          { node: null, cursor: Cursor('c1') },
          { node: 'valid', cursor: Cursor('c2') },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: Cursor('c1'),
          endCursor: Cursor('c2'),
        },
      };

      expect(connection.edges[0].node).toBe(null);
      expect(connection.edges[1].node).toBe('valid');
    });

    it('should handle very large page sizes', () => {
      const args: PaginationArgs = {
        first: 1000,
      };

      expect(args.first).toBe(1000);
    });

    it('should handle both forward and backward args (invalid but type-safe)', () => {
      // While this is invalid per Relay spec, the types allow it
      const args: PaginationArgs = {
        first: 10,
        after: Cursor('cursor-1'),
        last: 5,
        before: Cursor('cursor-2'),
      };

      // Application logic should validate this, but types don't prevent it
      expect(args.first).toBe(10);
      expect(args.last).toBe(5);
    });
  });
});