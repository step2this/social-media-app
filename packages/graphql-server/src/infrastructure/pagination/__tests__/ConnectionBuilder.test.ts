/**
 * ConnectionBuilder Tests
 * 
 * Test-Driven Development (TDD) for Relay Connection builder.
 * The ConnectionBuilder transforms raw data into Relay Connection format.
 * 
 * Relay Connection structure:
 * - edges: Array of { node, cursor }
 * - pageInfo: { hasNextPage, hasPreviousPage, startCursor, endCursor }
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Import types and classes we're about to create (will fail initially - TDD RED phase)
import { ConnectionBuilder } from '../ConnectionBuilder.js';
import { CursorCodec } from '../CursorCodec.js';
import { Connection, Edge } from '../../../shared/types/index.js';

describe('ConnectionBuilder', () => {
  let builder: ConnectionBuilder;
  let cursorCodec: CursorCodec;

  beforeEach(() => {
    cursorCodec = new CursorCodec();
    builder = new ConnectionBuilder(cursorCodec);
  });

  describe('Constructor', () => {
    it('should create ConnectionBuilder with CursorCodec', () => {
      expect(builder).toBeInstanceOf(ConnectionBuilder);
    });

    it('should accept ICursorCodec interface', () => {
      const customCodec = new CursorCodec();
      const customBuilder = new ConnectionBuilder(customCodec);

      expect(customBuilder).toBeInstanceOf(ConnectionBuilder);
    });
  });

  describe('build()', () => {
    interface TestPost {
      id: string;
      title: string;
      createdAt: string;
    }

    it('should build connection with edges and pageInfo', () => {
      const posts: TestPost[] = [
        { id: 'post-1', title: 'First Post', createdAt: '2024-01-01T00:00:00Z' },
        { id: 'post-2', title: 'Second Post', createdAt: '2024-01-02T00:00:00Z' },
      ];

      const connection = builder.build<TestPost>({
        nodes: posts,
        hasMore: true,
        getCursorData: (node) => ({ id: node.id, sortKey: node.createdAt }),
      });

      expect(connection.edges).toHaveLength(2);
      expect(connection.pageInfo).toBeDefined();
      expect(connection.pageInfo.hasNextPage).toBe(true);
    });

    it('should create edges with nodes and cursors', () => {
      const posts: TestPost[] = [
        { id: 'post-1', title: 'First Post', createdAt: '2024-01-01' },
      ];

      const connection = builder.build<TestPost>({
        nodes: posts,
        hasMore: false,
        getCursorData: (node) => ({ id: node.id, sortKey: node.createdAt }),
      });

      const edge = connection.edges[0];
      expect(edge.node).toEqual(posts[0]);
      expect(edge.cursor).toBeTruthy();
      expect(typeof edge.cursor).toBe('string');
    });

    it('should set hasNextPage based on hasMore', () => {
      const posts: TestPost[] = [
        { id: 'post-1', title: 'Post', createdAt: '2024-01-01' },
      ];

      const connectionWithMore = builder.build<TestPost>({
        nodes: posts,
        hasMore: true,
        getCursorData: (node) => ({ id: node.id, sortKey: node.createdAt }),
      });

      const connectionWithoutMore = builder.build<TestPost>({
        nodes: posts,
        hasMore: false,
        getCursorData: (node) => ({ id: node.id, sortKey: node.createdAt }),
      });

      expect(connectionWithMore.pageInfo.hasNextPage).toBe(true);
      expect(connectionWithoutMore.pageInfo.hasNextPage).toBe(false);
    });

    it('should set startCursor to first edge cursor', () => {
      const posts: TestPost[] = [
        { id: 'post-1', title: 'First', createdAt: '2024-01-01' },
        { id: 'post-2', title: 'Second', createdAt: '2024-01-02' },
      ];

      const connection = builder.build<TestPost>({
        nodes: posts,
        hasMore: false,
        getCursorData: (node) => ({ id: node.id, sortKey: node.createdAt }),
      });

      expect(connection.pageInfo.startCursor).toBe(connection.edges[0].cursor);
    });

    it('should set endCursor to last edge cursor', () => {
      const posts: TestPost[] = [
        { id: 'post-1', title: 'First', createdAt: '2024-01-01' },
        { id: 'post-2', title: 'Second', createdAt: '2024-01-02' },
      ];

      const connection = builder.build<TestPost>({
        nodes: posts,
        hasMore: false,
        getCursorData: (node) => ({ id: node.id, sortKey: node.createdAt }),
      });

      const lastIndex = connection.edges.length - 1;
      expect(connection.pageInfo.endCursor).toBe(connection.edges[lastIndex].cursor);
    });

    it('should handle empty nodes array', () => {
      const connection = builder.build<TestPost>({
        nodes: [],
        hasMore: false,
        getCursorData: (node) => ({ id: node.id, sortKey: node.createdAt }),
      });

      expect(connection.edges).toHaveLength(0);
      expect(connection.pageInfo.startCursor).toBe(null);
      expect(connection.pageInfo.endCursor).toBe(null);
      expect(connection.pageInfo.hasNextPage).toBe(false);
      expect(connection.pageInfo.hasPreviousPage).toBe(false);
    });

    it('should handle single node', () => {
      const posts: TestPost[] = [
        { id: 'post-1', title: 'Only Post', createdAt: '2024-01-01' },
      ];

      const connection = builder.build<TestPost>({
        nodes: posts,
        hasMore: false,
        getCursorData: (node) => ({ id: node.id, sortKey: node.createdAt }),
      });

      expect(connection.edges).toHaveLength(1);
      expect(connection.pageInfo.startCursor).toBe(connection.pageInfo.endCursor);
    });

    it('should set hasPreviousPage to false (forward pagination only)', () => {
      const posts: TestPost[] = [
        { id: 'post-1', title: 'Post', createdAt: '2024-01-01' },
      ];

      const connection = builder.build<TestPost>({
        nodes: posts,
        hasMore: true,
        getCursorData: (node) => ({ id: node.id, sortKey: node.createdAt }),
      });

      // ConnectionBuilder currently only supports forward pagination
      expect(connection.pageInfo.hasPreviousPage).toBe(false);
    });
  });

  describe('Cursor encoding', () => {
    interface Post {
      id: string;
      createdAt: string;
    }

    it('should encode cursor data correctly', () => {
      const posts: Post[] = [
        { id: 'post-123', createdAt: '2024-01-01T00:00:00Z' },
      ];

      const connection = builder.build<Post>({
        nodes: posts,
        hasMore: false,
        getCursorData: (node) => ({ id: node.id, sortKey: node.createdAt }),
      });

      // Decode cursor to verify it contains correct data
      const cursor = connection.edges[0].cursor;
      const decodedResult = cursorCodec.decode<string>(cursor);

      expect(decodedResult.success).toBe(true);
      if (decodedResult.success) {
        expect(decodedResult.data.id).toBe('post-123');
        expect(decodedResult.data.sortKey).toBe('2024-01-01T00:00:00Z');
      }
    });

    it('should handle different sortKey types', () => {
      interface RankedItem {
        id: string;
        score: number;
      }

      const items: RankedItem[] = [
        { id: 'item-1', score: 0.95 },
      ];

      const connection = builder.build<RankedItem>({
        nodes: items,
        hasMore: false,
        getCursorData: (node) => ({ id: node.id, sortKey: node.score }),
      });

      const cursor = connection.edges[0].cursor;
      const decodedResult = cursorCodec.decode<number>(cursor);

      expect(decodedResult.success).toBe(true);
      if (decodedResult.success) {
        expect(decodedResult.data.sortKey).toBe(0.95);
      }
    });

    it('should handle complex sortKey', () => {
      interface ComplexItem {
        id: string;
        metadata: {
          priority: number;
          timestamp: string;
        };
      }

      const items: ComplexItem[] = [
        {
          id: 'complex-1',
          metadata: { priority: 1, timestamp: '2024-01-01' },
        },
      ];

      const connection = builder.build<ComplexItem>({
        nodes: items,
        hasMore: false,
        getCursorData: (node) => ({ id: node.id, sortKey: node.metadata }),
      });

      const cursor = connection.edges[0].cursor;
      const decodedResult = cursorCodec.decode<{ priority: number; timestamp: string }>(cursor);

      expect(decodedResult.success).toBe(true);
      if (decodedResult.success) {
        expect(decodedResult.data.sortKey.priority).toBe(1);
        expect(decodedResult.data.sortKey.timestamp).toBe('2024-01-01');
      }
    });
  });

  describe('Real-world pagination scenarios', () => {
    interface User {
      id: string;
      name: string;
      createdAt: string;
    }

    it('should build first page of results', () => {
      const users: User[] = [
        { id: 'user-1', name: 'Alice', createdAt: '2024-01-01' },
        { id: 'user-2', name: 'Bob', createdAt: '2024-01-02' },
        { id: 'user-3', name: 'Charlie', createdAt: '2024-01-03' },
      ];

      const connection = builder.build<User>({
        nodes: users,
        hasMore: true, // More users available
        getCursorData: (node) => ({ id: node.id, sortKey: node.createdAt }),
      });

      expect(connection.edges).toHaveLength(3);
      expect(connection.pageInfo.hasNextPage).toBe(true);
      expect(connection.pageInfo.hasPreviousPage).toBe(false);
      expect(connection.pageInfo.startCursor).toBeTruthy();
      expect(connection.pageInfo.endCursor).toBeTruthy();
    });

    it('should build last page of results', () => {
      const users: User[] = [
        { id: 'user-98', name: 'User 98', createdAt: '2024-01-98' },
        { id: 'user-99', name: 'User 99', createdAt: '2024-01-99' },
        { id: 'user-100', name: 'User 100', createdAt: '2024-01-100' },
      ];

      const connection = builder.build<User>({
        nodes: users,
        hasMore: false, // No more users
        getCursorData: (node) => ({ id: node.id, sortKey: node.createdAt }),
      });

      expect(connection.edges).toHaveLength(3);
      expect(connection.pageInfo.hasNextPage).toBe(false);
      expect(connection.pageInfo.hasPreviousPage).toBe(false);
      expect(connection.pageInfo.endCursor).toBeTruthy();
    });

    it('should handle feed with time-based sorting', () => {
      interface FeedItem {
        id: string;
        content: string;
        publishedAt: string;
      }

      const feed: FeedItem[] = [
        { id: 'feed-1', content: 'Latest post', publishedAt: '2024-01-15T14:30:00Z' },
        { id: 'feed-2', content: 'Earlier post', publishedAt: '2024-01-15T12:00:00Z' },
      ];

      const connection = builder.build<FeedItem>({
        nodes: feed,
        hasMore: true,
        getCursorData: (node) => ({ id: node.id, sortKey: node.publishedAt }),
      });

      // Verify cursors can be decoded and contain timestamps
      const firstCursor = connection.edges[0].cursor;
      const decodedResult = cursorCodec.decode<string>(firstCursor);

      expect(decodedResult.success).toBe(true);
      if (decodedResult.success) {
        expect(decodedResult.data.sortKey).toBe('2024-01-15T14:30:00Z');
      }
    });

    it('should handle ranked search results', () => {
      interface SearchResult {
        id: string;
        title: string;
        relevanceScore: number;
      }

      const results: SearchResult[] = [
        { id: 'result-1', title: 'Best match', relevanceScore: 0.98 },
        { id: 'result-2', title: 'Good match', relevanceScore: 0.87 },
        { id: 'result-3', title: 'Fair match', relevanceScore: 0.72 },
      ];

      const connection = builder.build<SearchResult>({
        nodes: results,
        hasMore: true,
        getCursorData: (node) => ({ id: node.id, sortKey: node.relevanceScore }),
      });

      expect(connection.edges).toHaveLength(3);
      expect(connection.edges[0].node.title).toBe('Best match');
      expect(connection.pageInfo.hasNextPage).toBe(true);
    });
  });

  describe('Type safety', () => {
    it('should preserve node type through Connection<T>', () => {
      interface Product {
        id: string;
        name: string;
        price: number;
      }

      const products: Product[] = [
        { id: 'prod-1', name: 'Widget', price: 9.99 },
      ];

      const connection: Connection<Product> = builder.build<Product>({
        nodes: products,
        hasMore: false,
        getCursorData: (node) => ({ id: node.id, sortKey: node.price }),
      });

      // TypeScript knows connection.edges[0].node is Product
      const product: Product = connection.edges[0].node;
      expect(product.name).toBe('Widget');
      expect(product.price).toBe(9.99);
    });

    it('should work with generic types', () => {
      const numbers = [1, 2, 3];

      const connection = builder.build<number>({
        nodes: numbers,
        hasMore: false,
        getCursorData: (node) => ({ id: node.toString(), sortKey: node }),
      });

      expect(connection.edges[0].node).toBe(1);
      expect(connection.edges[1].node).toBe(2);
    });

    it('should work with nullable types', () => {
      interface NullableItem {
        id: string;
        value: string | null;
      }

      const items: NullableItem[] = [
        { id: 'item-1', value: 'present' },
        { id: 'item-2', value: null },
      ];

      const connection = builder.build<NullableItem>({
        nodes: items,
        hasMore: false,
        getCursorData: (node) => ({ id: node.id, sortKey: node.id }),
      });

      expect(connection.edges[0].node.value).toBe('present');
      expect(connection.edges[1].node.value).toBe(null);
    });
  });

  describe('Edge cases', () => {
    interface Item {
      id: string;
      key: string;
    }

    it('should handle very large node arrays', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        key: `key-${i}`,
      }));

      const connection = builder.build<Item>({
        nodes: largeArray,
        hasMore: true,
        getCursorData: (node) => ({ id: node.id, sortKey: node.key }),
      });

      expect(connection.edges).toHaveLength(1000);
      expect(connection.pageInfo.startCursor).toBeTruthy();
      expect(connection.pageInfo.endCursor).toBeTruthy();
    });

    it('should handle nodes with special characters in IDs', () => {
      const items: Item[] = [
        { id: 'item-!@#$%^&*()', key: 'key-1' },
      ];

      const connection = builder.build<Item>({
        nodes: items,
        hasMore: false,
        getCursorData: (node) => ({ id: node.id, sortKey: node.key }),
      });

      expect(connection.edges).toHaveLength(1);
      expect(connection.edges[0].node.id).toBe('item-!@#$%^&*()');
    });

    it('should handle unicode characters in sortKey', () => {
      const items: Item[] = [
        { id: 'item-1', key: '测试-日本語-한글' },
      ];

      const connection = builder.build<Item>({
        nodes: items,
        hasMore: false,
        getCursorData: (node) => ({ id: node.id, sortKey: node.key }),
      });

      const cursor = connection.edges[0].cursor;
      const decodedResult = cursorCodec.decode<string>(cursor);

      expect(decodedResult.success).toBe(true);
      if (decodedResult.success) {
        expect(decodedResult.data.sortKey).toBe('测试-日本語-한글');
      }
    });

    it('should be deterministic for same input', () => {
      const items: Item[] = [
        { id: 'item-1', key: 'key-1' },
        { id: 'item-2', key: 'key-2' },
      ];

      const connection1 = builder.build<Item>({
        nodes: items,
        hasMore: false,
        getCursorData: (node) => ({ id: node.id, sortKey: node.key }),
      });

      const connection2 = builder.build<Item>({
        nodes: items,
        hasMore: false,
        getCursorData: (node) => ({ id: node.id, sortKey: node.key }),
      });

      expect(connection1.edges[0].cursor).toBe(connection2.edges[0].cursor);
      expect(connection1.edges[1].cursor).toBe(connection2.edges[1].cursor);
    });
  });

  describe('Integration with CursorCodec', () => {
    it('should use provided CursorCodec instance', () => {
      interface Post {
        id: string;
        timestamp: string;
      }

      const codec = new CursorCodec();
      const customBuilder = new ConnectionBuilder(codec);

      const posts: Post[] = [
        { id: 'post-1', timestamp: '2024-01-01' },
      ];

      const connection = customBuilder.build<Post>({
        nodes: posts,
        hasMore: false,
        getCursorData: (node) => ({ id: node.id, sortKey: node.timestamp }),
      });

      // Verify cursor can be decoded by same codec
      const cursor = connection.edges[0].cursor;
      const result = codec.decode<string>(cursor);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('post-1');
      }
    });

    it('should handle CursorCodec encoding correctly', () => {
      interface Item {
        id: string;
        value: number;
      }

      const items: Item[] = [
        { id: 'item-123', value: 42 },
      ];

      const connection = builder.build<Item>({
        nodes: items,
        hasMore: false,
        getCursorData: (node) => ({ id: node.id, sortKey: node.value }),
      });

      // Verify cursor is base64-encoded
      const cursor = connection.edges[0].cursor;
      expect(cursor).toMatch(/^[A-Za-z0-9+/=]+$/);

      // Verify cursor can be decoded
      const result = cursorCodec.decode<number>(cursor);
      expect(result.success).toBe(true);
    });
  });
});
