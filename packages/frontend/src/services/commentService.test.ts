import { describe, it, expect, vi, beforeEach } from 'vitest';
import { commentService } from './commentService';
import { apiClient } from './apiClient';

vi.mock('./apiClient');

describe('commentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createComment', () => {
    it('should create a comment with postId and content', async () => {
      const mockResponse = {
        comment: {
          id: 'comment-123',
          postId: 'post-123',
          userId: 'user-123',
          userHandle: 'testuser',
          content: 'This is a test comment',
          createdAt: '2025-10-11T10:00:00.000Z',
          updatedAt: '2025-10-11T10:00:00.000Z'
        },
        commentsCount: 5
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const result = await commentService.createComment('post-123', 'This is a test comment');

      expect(apiClient.post).toHaveBeenCalledWith('/comments', {
        postId: 'post-123',
        content: 'This is a test comment'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Network error'));

      await expect(commentService.createComment('post-123', 'Test comment')).rejects.toThrow('Network error');
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment with commentId', async () => {
      const mockResponse = {
        success: true
      };

      vi.mocked(apiClient.delete).mockResolvedValueOnce(mockResponse);

      const result = await commentService.deleteComment('comment-123');

      expect(apiClient.delete).toHaveBeenCalledWith('/comments', { commentId: 'comment-123' });
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(apiClient.delete).mockRejectedValueOnce(new Error('Network error'));

      await expect(commentService.deleteComment('comment-123')).rejects.toThrow('Network error');
    });
  });

  describe('getComments', () => {
    it('should get comments for a post', async () => {
      const mockResponse = {
        comments: [
          {
            id: 'comment-1',
            postId: 'post-123',
            userId: 'user-1',
            userHandle: 'user1',
            content: 'Comment 1',
            createdAt: '2025-10-11T10:00:00.000Z',
            updatedAt: '2025-10-11T10:00:00.000Z'
          },
          {
            id: 'comment-2',
            postId: 'post-123',
            userId: 'user-2',
            userHandle: 'user2',
            content: 'Comment 2',
            createdAt: '2025-10-11T10:01:00.000Z',
            updatedAt: '2025-10-11T10:01:00.000Z'
          }
        ],
        totalCount: 2,
        limit: 10,
        cursor: null,
        hasMore: false
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await commentService.getComments('post-123');

      expect(apiClient.get).toHaveBeenCalledWith('/comments?postId=post-123');
      expect(result).toEqual(mockResponse);
    });

    it('should support pagination with limit', async () => {
      const mockResponse = {
        comments: [],
        totalCount: 0,
        limit: 5,
        cursor: null,
        hasMore: false
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      await commentService.getComments('post-123', 5);

      expect(apiClient.get).toHaveBeenCalledWith('/comments?postId=post-123&limit=5');
    });

    it('should support pagination with cursor', async () => {
      const mockResponse = {
        comments: [],
        totalCount: 0,
        limit: 10,
        cursor: 'next-cursor',
        hasMore: true
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      await commentService.getComments('post-123', undefined, 'cursor-123');

      expect(apiClient.get).toHaveBeenCalledWith('/comments?postId=post-123&cursor=cursor-123');
    });

    it('should support pagination with both limit and cursor', async () => {
      const mockResponse = {
        comments: [],
        totalCount: 0,
        limit: 5,
        cursor: 'next-cursor',
        hasMore: true
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      await commentService.getComments('post-123', 5, 'cursor-123');

      expect(apiClient.get).toHaveBeenCalledWith('/comments?postId=post-123&limit=5&cursor=cursor-123');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network error'));

      await expect(commentService.getComments('post-123')).rejects.toThrow('Network error');
    });
  });
});
