/**
 * PostAdapter Tests (TDD RED → GREEN)
 *
 * Minimal behavior-focused tests using dependency injection and shared fixtures.
 * Tests that PostAdapter correctly uses PostService and transforms to GraphQL types.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PostAdapter } from '../PostAdapter';
import { createMockPosts, createMockPostGridItems } from '@social-media-app/shared/test-utils';
import { GraphQLError } from 'graphql';
import type { PostService } from '@social-media-app/dal';

describe('PostAdapter', () => {
  let adapter: PostAdapter;
  let mockPostService: PostService;

  beforeEach(() => {
    // Inject mock service - no spies needed
    mockPostService = {
      getPostById: async () => null,
      getUserPostsByHandle: async () => ({ posts: [], hasMore: false, totalCount: 0 }),
    } as any;

    adapter = new PostAdapter(mockPostService);
  });

  describe('getPostById', () => {
    it('transforms Post to GraphQL Post', async () => {
      const post = createMockPosts(1)[0];
      mockPostService.getPostById = async () => post;

      const result = await adapter.getPostById('post-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('post-1');
      expect(result?.userId).toBe('user-1');
    });

    it('returns null when post not found', async () => {
      mockPostService.getPostById = async () => null;

      const result = await adapter.getPostById('nonexistent');

      expect(result).toBeNull();
    });

    it('validates postId parameter', async () => {
      await expect(adapter.getPostById('')).rejects.toThrow('postId is required');
    });

    it('throws GraphQLError on service error', async () => {
      mockPostService.getPostById = async () => {
        throw new Error('Database error');
      };

      await expect(adapter.getPostById('post-1')).rejects.toThrow(GraphQLError);
    });
  });

  describe('getUserPosts', () => {
    it('transforms PostGridItems to GraphQL PostConnection', async () => {
      const posts = createMockPostGridItems(2);
      mockPostService.getUserPostsByHandle = async () => ({
        posts,
        hasMore: false,
        totalCount: 2,
      });

      const result = await adapter.getUserPosts({ handle: 'johndoe', first: 10 });

      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].node.id).toBe('post-1');
      expect(result.edges[0].cursor).toBeDefined();
      expect(result.pageInfo.hasNextPage).toBe(false);
    });

    it('handles pagination with cursor', async () => {
      const posts = createMockPostGridItems(1);
      mockPostService.getUserPostsByHandle = async () => ({
        posts,
        hasMore: true,
        totalCount: 10,
      });

      const result = await adapter.getUserPosts({ handle: 'johndoe', first: 1, after: 'cursor-abc' });

      expect(result.pageInfo.hasNextPage).toBe(true);
    });

    it('validates handle parameter', async () => {
      await expect(adapter.getUserPosts({ handle: '', first: 10 })).rejects.toThrow(
        'handle is required'
      );
    });
  });
});
