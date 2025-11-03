/**
 * FeedAdapter Tests (TDD RED → GREEN)
 *
 * Minimal behavior-focused tests using dependency injection and shared fixtures.
 * Tests that FeedAdapter correctly uses PostService and transforms to GraphQL types.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FeedAdapter } from '../FeedAdapter';
import { createMockPostGridItems, createMockPostsWithAuthor } from '@social-media-app/shared/test-utils';
import { GraphQLError } from 'graphql';
import type { PostService } from '@social-media-app/dal';
import type { FollowService } from '@social-media-app/dal';

describe('FeedAdapter', () => {
  let adapter: FeedAdapter;
  let mockPostService: PostService;
  let mockFollowService: FollowService;

  beforeEach(() => {
    // Inject mock services - no spies needed
    mockPostService = {
      getFeedPosts: async () => ({ posts: [], hasMore: false, totalCount: 0 }),
      getFollowingFeedPosts: async () => ({ posts: [], hasMore: false }),
    } as any;

    mockFollowService = {} as any;

    adapter = new FeedAdapter(mockPostService, mockFollowService);
  });

  describe('getExploreFeed', () => {
    it('transforms PostGridItems to GraphQL PostConnection', async () => {
      const posts = createMockPostGridItems(2);
      mockPostService.getFeedPosts = async () => ({
        posts,
        hasMore: false,
        totalCount: 2,
      });

      const result = await adapter.getExploreFeed({ first: 10 });

      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].node.id).toBe('post-1');
      expect(result.edges[0].cursor).toBeDefined();
      expect(result.pageInfo.hasNextPage).toBe(false);
    });

    it('handles pagination with cursor', async () => {
      const posts = createMockPostGridItems(1);
      mockPostService.getFeedPosts = async () => ({
        posts,
        hasMore: true,
        totalCount: 10,
      });

      const result = await adapter.getExploreFeed({ first: 1, after: 'cursor-abc' });

      expect(result.pageInfo.hasNextPage).toBe(true);
    });

    it('throws GraphQLError on service error', async () => {
      mockPostService.getFeedPosts = async () => {
        throw new Error('Database error');
      };

      await expect(adapter.getExploreFeed({ first: 10 })).rejects.toThrow(GraphQLError);
    });
  });

  describe('getFollowingFeed', () => {
    it('transforms PostWithAuthor to GraphQL PostConnection', async () => {
      const posts = createMockPostsWithAuthor(2);
      mockPostService.getFollowingFeedPosts = async () => ({
        posts,
        hasMore: false,
      });

      const result = await adapter.getFollowingFeed({ userId: 'user-1', first: 10 });

      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].node.id).toBe('post-1');
      expect(result.edges[0].node.author).toBeDefined();
      expect(result.pageInfo.hasNextPage).toBe(false);
    });

    it('validates userId parameter', async () => {
      await expect(adapter.getFollowingFeed({ userId: '', first: 10 })).rejects.toThrow(
        'userId is required'
      );
    });
  });
});
