/**
 * TypeMapper Tests (TDD RED)
 *
 * Tests for type transformation utilities that convert domain types
 * from @social-media-app/shared to GraphQL schema types.
 */

import { describe, it, expect } from 'vitest';
import { TypeMapper } from '../TypeMapper.js';
import type { Comment as DomainComment } from '@social-media-app/shared';

describe('TypeMapper', () => {
  describe('toGraphQLComment', () => {
    it('transforms domain Comment to GraphQL Comment', () => {
      const domainComment: DomainComment = {
        id: 'comment-1',
        postId: 'post-1',
        userId: 'user-1',
        userHandle: 'testuser',
        content: 'Great post!',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const result = TypeMapper.toGraphQLComment(domainComment);

      // Verify transformation
      expect(result.id).toBe('comment-1');
      expect(result.postId).toBe('post-1');
      expect(result.userId).toBe('user-1');
      expect(result.content).toBe('Great post!');
      expect(result.createdAt).toBe('2024-01-01T00:00:00Z');
      expect(result.author.id).toBe('user-1');
      expect(result.author.handle).toBe('testuser');
      expect(result.author.username).toBe('testuser');
    });

    it('handles missing optional fields', () => {
      const domainComment: DomainComment = {
        id: 'comment-1',
        postId: 'post-1',
        userId: 'user-1',
        userHandle: 'testuser',
        content: 'Great post!',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const result = TypeMapper.toGraphQLComment(domainComment);

      expect(result.author).toBeDefined();
      expect(result.author.handle).toBe('testuser');
      expect(result.author.id).toBe('user-1');
    });
  });

  describe('toGraphQLConnection', () => {
    it('transforms paginated domain results to GraphQL Connection', () => {
      const domainComments: DomainComment[] = [
        {
          id: 'comment-1',
          postId: 'post-1',
          userId: 'user-1',
          userHandle: 'user1',
          content: 'First',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'comment-2',
          postId: 'post-1',
          userId: 'user-2',
          userHandle: 'user2',
          content: 'Second',
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ];

      const result = TypeMapper.toGraphQLConnection(
        domainComments,
        TypeMapper.toGraphQLComment,
        {
          first: 2,
          hasNextPage: true,
        }
      );

      expect(result.edges).toHaveLength(2);

      // Type-safe access with proper assertions
      const firstEdge = result.edges[0];
      const secondEdge = result.edges[1];

      expect(firstEdge).toBeDefined();
      expect(secondEdge).toBeDefined();

      if (firstEdge && secondEdge) {
        expect(firstEdge.node.id).toBe('comment-1');
        expect(firstEdge.cursor).toBeDefined();
        expect(firstEdge.cursor).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64 pattern
        expect(result.pageInfo.hasNextPage).toBe(true);
        expect(result.pageInfo.hasPreviousPage).toBe(false);
        expect(result.pageInfo.startCursor).toBe(firstEdge.cursor);
        expect(result.pageInfo.endCursor).toBe(secondEdge.cursor);
      }
    });

    it('generates stable cursors for pagination', () => {
      const domainComments: DomainComment[] = [
        {
          id: 'comment-1',
          postId: 'post-1',
          userId: 'user-1',
          userHandle: 'user1',
          content: 'First',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const result1 = TypeMapper.toGraphQLConnection(
        domainComments,
        TypeMapper.toGraphQLComment,
        { first: 1 }
      );
      const result2 = TypeMapper.toGraphQLConnection(
        domainComments,
        TypeMapper.toGraphQLComment,
        { first: 1 }
      );

      // Type-safe access
      const edge1 = result1.edges[0];
      const edge2 = result2.edges[0];

      expect(edge1).toBeDefined();
      expect(edge2).toBeDefined();

      if (edge1 && edge2) {
        expect(edge1.cursor).toBe(edge2.cursor);
      }
    });

    it('handles empty array', () => {
      const domainComments: DomainComment[] = [];

      const result = TypeMapper.toGraphQLConnection(
        domainComments,
        TypeMapper.toGraphQLComment,
        { first: 10 }
      );

      expect(result.edges).toHaveLength(0);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
      expect(result.pageInfo.startCursor).toBeNull();
      expect(result.pageInfo.endCursor).toBeNull();
    });

    it('handles hasPreviousPage option', () => {
      const domainComments: DomainComment[] = [
        {
          id: 'comment-1',
          postId: 'post-1',
          userId: 'user-1',
          userHandle: 'user1',
          content: 'First',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const result = TypeMapper.toGraphQLConnection(
        domainComments,
        TypeMapper.toGraphQLComment,
        {
          first: 1,
          hasNextPage: false,
          hasPreviousPage: true,
        }
      );

      expect(result.pageInfo.hasPreviousPage).toBe(true);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });
  });
});
