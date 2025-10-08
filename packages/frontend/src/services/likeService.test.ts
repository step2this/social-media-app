import { describe, it, expect, vi, beforeEach } from 'vitest';
import { likeService } from './likeService';
import { apiClient } from './apiClient';

vi.mock('./apiClient');

describe('likeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('likePost', () => {
    it('should like a post successfully', async () => {
      const mockResponse = {
        success: true,
        likesCount: 42,
        isLiked: true
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const result = await likeService.likePost('post-123');

      expect(apiClient.post).toHaveBeenCalledWith('/likes', { postId: 'post-123' });
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Network error'));

      await expect(likeService.likePost('post-123')).rejects.toThrow('Network error');
    });
  });

  describe('unlikePost', () => {
    it('should unlike a post successfully', async () => {
      const mockResponse = {
        success: true,
        likesCount: 41,
        isLiked: false
      };

      vi.mocked(apiClient.delete).mockResolvedValueOnce(mockResponse);

      const result = await likeService.unlikePost('post-123');

      expect(apiClient.delete).toHaveBeenCalledWith('/likes', { postId: 'post-123' });
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(apiClient.delete).mockRejectedValueOnce(new Error('Network error'));

      await expect(likeService.unlikePost('post-123')).rejects.toThrow('Network error');
    });
  });

  describe('getLikeStatus', () => {
    it('should get like status successfully', async () => {
      const mockResponse = {
        isLiked: true,
        likesCount: 42
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await likeService.getLikeStatus('post-123');

      expect(apiClient.get).toHaveBeenCalledWith('/likes/post-123');
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network error'));

      await expect(likeService.getLikeStatus('post-123')).rejects.toThrow('Network error');
    });
  });
});
