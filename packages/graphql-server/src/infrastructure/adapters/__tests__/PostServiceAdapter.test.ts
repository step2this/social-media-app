/**
 * PostServiceAdapter Tests
 *
 * TDD for PostService adapter following established patterns.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PostService } from '@social-media-app/dal';
import { PostServiceAdapter } from '../PostServiceAdapter.js';
import { PostId, UserId, Cursor } from '../../../shared/types/index.js';
import type { Post } from '../../../domain/repositories/IPostRepository.js';

describe('PostServiceAdapter', () => {
  let mockPostService: PostService;
  let adapter: PostServiceAdapter;

  beforeEach(() => {
    mockPostService = {
      getPostById: vi.fn(),
      getUserPosts: vi.fn(), // Correct method name (not getPostsByUser)
    } as unknown as PostService;

    adapter = new PostServiceAdapter(mockPostService);
  });

  describe('findById()', () => {
    it('should return post when found', async () => {
      // Mock DAL Post type (which has additional fields compared to domain Post)
      const mockDalPost = {
        id: 'post-123',
        userId: 'user-123',
        userHandle: 'testuser',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        caption: 'Test post',
        tags: [],
        likesCount: 42,
        commentsCount: 5,
        isPublic: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(mockPostService.getPostById).mockResolvedValue(mockDalPost);

      const result = await adapter.findById(PostId('post-123'));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.id).toBe('post-123');
        expect(result.data?.caption).toBe('Test post');
      }
    });

    it('should return null when post not found', async () => {
      vi.mocked(mockPostService.getPostById).mockResolvedValue(null);

      const result = await adapter.findById(PostId('nonexistent'));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(null);
      }
    });

    it('should return error when service throws', async () => {
      const error = new Error('Database error');
      vi.mocked(mockPostService.getPostById).mockRejectedValue(error);

      const result = await adapter.findById(PostId('post-123'));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(error);
      }
    });
  });

  describe('findByUser()', () => {
    it('should return paginated posts for user', async () => {
      // Mock DAL Post type (which has additional fields compared to domain Post)
      const mockDalPosts = [
        {
          id: 'post-1',
          userId: 'user-123',
          userHandle: 'testuser',
          imageUrl: 'https://example.com/1.jpg',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          caption: 'First post',
          tags: [],
          likesCount: 10,
          commentsCount: 2,
          isPublic: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'post-2',
          userId: 'user-123',
          userHandle: 'testuser',
          imageUrl: 'https://example.com/2.jpg',
          thumbnailUrl: 'https://example.com/thumb2.jpg',
          caption: 'Second post',
          tags: [],
          likesCount: 20,
          commentsCount: 3,
          isPublic: true,
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ];

      vi.mocked(mockPostService.getUserPosts).mockResolvedValue({
        posts: mockDalPosts,
        hasMore: true,
      });

      const result = await adapter.findByUser(UserId('user-123'), { first: 10 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.edges).toHaveLength(2);
        expect(result.data.pageInfo.hasNextPage).toBe(true);
        expect(result.data.edges[0].node.caption).toBe('First post');
      }
    });

    it('should handle empty result', async () => {
      // Arrange: Mock service to return empty posts
      vi.mocked(mockPostService.getUserPosts).mockResolvedValue({
        posts: [],
        hasMore: false,
      });

      const result = await adapter.findByUser(UserId('user-123'), { first: 10 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.edges).toHaveLength(0);
        expect(result.data.pageInfo.hasNextPage).toBe(false);
      }
    });

    it('should return error when service throws', async () => {
      const error = new Error('Service error');
      vi.mocked(mockPostService.getUserPosts).mockRejectedValue(error);

      const result = await adapter.findByUser(UserId('user-123'), { first: 10 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(error);
      }
    });

    it('should pass pagination parameters correctly', async () => {
      vi.mocked(mockPostService.getUserPosts).mockResolvedValue({
        posts: [],
        hasMore: false,
      });

      await adapter.findByUser(UserId('user-123'), {
        first: 20,
        after: Cursor('cursor-123')
      });

      expect(mockPostService.getUserPosts).toHaveBeenCalledWith(
        'user-123',
        20,
        'cursor-123'
      );
    });
  });

  describe('Type safety', () => {
    it('should implement IPostRepository interface', () => {
      expect(adapter.findById).toBeDefined();
      expect(adapter.findByUser).toBeDefined();
      expect(typeof adapter.findById).toBe('function');
      expect(typeof adapter.findByUser).toBe('function');
    });
  });
});
