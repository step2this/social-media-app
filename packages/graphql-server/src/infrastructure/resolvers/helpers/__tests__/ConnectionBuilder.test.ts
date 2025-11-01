/**
 * ConnectionBuilder Helper Tests
 * TDD: Write tests first to define the API we want
 *
 * Pattern from SKILL.md: Generics with Constraints (Section 1)
 */

import { describe, it, expect } from 'vitest';
import { buildConnection, decodeCursor } from '../ConnectionBuilder.js';

interface TestPost {
  id: string;
  userId: string;
  createdAt: string;
  caption: string;
}

describe('ConnectionBuilder', () => {
  describe('buildConnection', () => {
    describe('with items', () => {
      it('should build connection with edges and pageInfo', () => {
        const posts: TestPost[] = [
          { id: '1', userId: 'user-1', createdAt: '2024-01-01', caption: 'Test 1' },
          { id: '2', userId: 'user-1', createdAt: '2024-01-02', caption: 'Test 2' },
        ];

        const connection = buildConnection({
          items: posts,
          hasMore: true,
          getCursorKeys: (post) => ({
            PK: `USER#${post.userId}`,
            SK: `POST#${post.createdAt}#${post.id}`,
          }),
        });

        expect(connection.edges).toHaveLength(2);
        expect(connection.edges[0].node).toEqual(posts[0]);
        expect(connection.edges[1].node).toEqual(posts[1]);
        expect(connection.pageInfo.hasNextPage).toBe(true);
        expect(connection.pageInfo.hasPreviousPage).toBe(false);
      });

      it('should encode cursor keys to base64', () => {
        const posts: TestPost[] = [
          { id: '1', userId: 'user-1', createdAt: '2024-01-01', caption: 'Test' },
        ];

        const connection = buildConnection({
          items: posts,
          hasMore: false,
          getCursorKeys: (post) => ({
            PK: `USER#${post.userId}`,
            SK: `POST#${post.createdAt}#${post.id}`,
          }),
        });

        const cursor = connection.edges[0].cursor;
        const decoded = decodeCursor(cursor);

        expect(decoded).toEqual({
          PK: 'USER#user-1',
          SK: 'POST#2024-01-01#1',
        });
      });

      it('should set correct startCursor and endCursor', () => {
        const posts: TestPost[] = [
          { id: '1', userId: 'user-1', createdAt: '2024-01-01', caption: 'First' },
          { id: '2', userId: 'user-1', createdAt: '2024-01-02', caption: 'Second' },
          { id: '3', userId: 'user-1', createdAt: '2024-01-03', caption: 'Third' },
        ];

        const connection = buildConnection({
          items: posts,
          hasMore: false,
          getCursorKeys: (post) => ({
            PK: `USER#${post.userId}`,
            SK: `POST#${post.createdAt}#${post.id}`,
          }),
        });

        expect(connection.pageInfo.startCursor).toBe(connection.edges[0].cursor);
        expect(connection.pageInfo.endCursor).toBe(connection.edges[2].cursor);
      });
    });

    describe('with empty items', () => {
      it('should return empty connection with null cursors', () => {
        const connection = buildConnection({
          items: [],
          hasMore: false,
          getCursorKeys: () => ({ PK: '', SK: '' }),
        });

        expect(connection.edges).toHaveLength(0);
        expect(connection.pageInfo.hasNextPage).toBe(false);
        expect(connection.pageInfo.hasPreviousPage).toBe(false);
        expect(connection.pageInfo.startCursor).toBeNull();
        expect(connection.pageInfo.endCursor).toBeNull();
      });
    });

    describe('with single item', () => {
      it('should set startCursor and endCursor to the same value', () => {
        const posts: TestPost[] = [
          { id: '1', userId: 'user-1', createdAt: '2024-01-01', caption: 'Only one' },
        ];

        const connection = buildConnection({
          items: posts,
          hasMore: false,
          getCursorKeys: (post) => ({
            PK: `USER#${post.userId}`,
            SK: `POST#${post.createdAt}#${post.id}`,
          }),
        });

        expect(connection.pageInfo.startCursor).toBe(connection.pageInfo.endCursor);
        expect(connection.edges).toHaveLength(1);
      });
    });
  });

  describe('decodeCursor', () => {
    it('should decode base64 cursor to keys', () => {
      const keys = { PK: 'USER#123', SK: 'POST#2024-01-01#1' };
      const cursor = Buffer.from(JSON.stringify(keys)).toString('base64');

      const decoded = decodeCursor(cursor);

      expect(decoded).toEqual(keys);
    });
  });
});
