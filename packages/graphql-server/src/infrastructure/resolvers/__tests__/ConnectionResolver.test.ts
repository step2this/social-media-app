/**
 * ConnectionResolver Tests
 *
 * TDD for ConnectionResolver generic pagination helper.
 * Tests pagination validation and connection resolution.
 */

import { describe, it, expect, vi } from 'vitest';
import { GraphQLError } from 'graphql';
import { ConnectionResolver, type FetchConnectionFn } from '../ConnectionResolver.js';
import { Cursor } from '../../../shared/types/index.js';

interface MockPost {
  id: string;
  caption: string;
}

describe('ConnectionResolver', () => {
  describe('Success cases', () => {
    it('should return connection when fetch succeeds', async () => {
      const mockConnection = {
        edges: [
          {
            cursor: Cursor('cursor-1'),
            node: { id: 'post-1', caption: 'First post' },
          },
          {
            cursor: Cursor('cursor-2'),
            node: { id: 'post-2', caption: 'Second post' },
          },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: Cursor('cursor-1'),
          endCursor: Cursor('cursor-2'),
        },
      };

      const mockFetch: FetchConnectionFn<MockPost> = vi.fn(async () => ({
        success: true,
        data: mockConnection,
      }));

      const resolver = new ConnectionResolver(mockFetch);
      const result = await resolver.resolve({ first: 10 });

      expect(result.edges).toHaveLength(2);
      expect(result.pageInfo.hasNextPage).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith({ first: 10 });
    });

    it('should handle empty connections', async () => {
      const emptyConnection = {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      };

      const mockFetch: FetchConnectionFn<MockPost> = vi.fn(async () => ({
        success: true,
        data: emptyConnection,
      }));

      const resolver = new ConnectionResolver(mockFetch);
      const result = await resolver.resolve({ first: 10 });

      expect(result.edges).toHaveLength(0);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });

    it('should pass pagination args correctly', async () => {
      const mockFetch: FetchConnectionFn<MockPost> = vi.fn(async () => ({
        success: true,
        data: {
          edges: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
        },
      }));

      const resolver = new ConnectionResolver(mockFetch);
      await resolver.resolve({ first: 20 });

      expect(mockFetch).toHaveBeenCalledWith({ first: 20 });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle cursor-based pagination (after)', async () => {
      const mockConnection = {
        edges: [
          {
            cursor: Cursor('cursor-11'),
            node: { id: 'post-11', caption: 'Page 2 post' },
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: true,
          startCursor: Cursor('cursor-11'),
          endCursor: Cursor('cursor-11'),
        },
      };

      const mockFetch: FetchConnectionFn<MockPost> = vi.fn(async (args) => {
        expect(args.after).toBe('cursor-10');
        return {
          success: true,
          data: mockConnection,
        };
      });

      const resolver = new ConnectionResolver(mockFetch);
      const result = await resolver.resolve({ first: 10, after: Cursor('cursor-10') });

      expect(result.pageInfo.hasPreviousPage).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith({ first: 10, after: 'cursor-10' });
    });

    it('should preserve edge cursor values', async () => {
      const mockConnection = {
        edges: [
          {
            cursor: Cursor('custom-cursor-1'),
            node: { id: 'post-1', caption: 'Post 1' },
          },
          {
            cursor: Cursor('custom-cursor-2'),
            node: { id: 'post-2', caption: 'Post 2' },
          },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: Cursor('custom-cursor-1'),
          endCursor: Cursor('custom-cursor-2'),
        },
      };

      const mockFetch: FetchConnectionFn<MockPost> = vi.fn(async () => ({
        success: true,
        data: mockConnection,
      }));

      const resolver = new ConnectionResolver(mockFetch);
      const result = await resolver.resolve({ first: 10 });

      expect(result.edges[0].cursor).toBe('custom-cursor-1');
      expect(result.edges[1].cursor).toBe('custom-cursor-2');
    });

    it('should preserve pageInfo correctly', async () => {
      const mockConnection = {
        edges: [
          {
            cursor: Cursor('cursor-1'),
            node: { id: 'post-1', caption: 'Post 1' },
          },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: true,
          startCursor: Cursor('cursor-1'),
          endCursor: Cursor('cursor-1'),
        },
      };

      const mockFetch: FetchConnectionFn<MockPost> = vi.fn(async () => ({
        success: true,
        data: mockConnection,
      }));

      const resolver = new ConnectionResolver(mockFetch);
      const result = await resolver.resolve({ first: 10 });

      expect(result.pageInfo.hasNextPage).toBe(true);
      expect(result.pageInfo.hasPreviousPage).toBe(true);
      expect(result.pageInfo.startCursor).toBe('cursor-1');
      expect(result.pageInfo.endCursor).toBe('cursor-1');
    });
  });

  describe('Validation', () => {
    it('should throw error when pagination.first <= 0', async () => {
      const mockFetch: FetchConnectionFn<MockPost> = vi.fn();
      const resolver = new ConnectionResolver(mockFetch);

      await expect(resolver.resolve({ first: 0 })).rejects.toThrow(GraphQLError);
      await expect(resolver.resolve({ first: 0 })).rejects.toThrow('greater than 0');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw error when pagination.first is not provided', async () => {
      const mockFetch: FetchConnectionFn<MockPost> = vi.fn();
      const resolver = new ConnectionResolver(mockFetch);

      await expect(resolver.resolve({} as any)).rejects.toThrow(GraphQLError);
      await expect(resolver.resolve({} as any)).rejects.toThrow('greater than 0');

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should throw error when fetch fails', async () => {
      const fetchError = new Error('Database connection failed');

      const mockFetch: FetchConnectionFn<MockPost> = vi.fn(async () => ({
        success: false,
        error: fetchError,
      }));

      const resolver = new ConnectionResolver(mockFetch);

      await expect(resolver.resolve({ first: 10 })).rejects.toThrow(GraphQLError);
      await expect(resolver.resolve({ first: 10 })).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('Integration', () => {
    it('should work with mock use case', async () => {
      interface Profile {
        id: string;
        handle: string;
      }

      const mockUseCase = {
        execute: vi.fn().mockResolvedValue({
          success: true,
          data: {
            edges: [
              {
                cursor: Cursor('cursor-1'),
                node: { id: 'user-1', handle: '@alice' },
              },
            ],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: Cursor('cursor-1'),
              endCursor: Cursor('cursor-1'),
            },
          },
        }),
      };

      const fetchFn: FetchConnectionFn<Profile> = async (args) => {
        return mockUseCase.execute({ userId: 'user-123', pagination: args });
      };

      const resolver = new ConnectionResolver(fetchFn);
      const result = await resolver.resolve({ first: 10 });

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node.handle).toBe('@alice');
      expect(mockUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-123',
        pagination: { first: 10 },
      });
    });
  });
});
