import { describe, it, expect, vi, beforeEach } from 'vitest';
import { followService } from './followService';
import { apiClient } from './apiClient';

vi.mock('./apiClient');

describe('followService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('followUser', () => {
    it('should follow a user successfully', async () => {
      const mockResponse = {
        success: true,
        followersCount: 0,
        followingCount: 0,
        isFollowing: true
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const result = await followService.followUser('user-123');

      expect(apiClient.post).toHaveBeenCalledWith('/follows', { userId: 'user-123' });
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Network error'));

      await expect(followService.followUser('user-123')).rejects.toThrow('Network error');
    });
  });

  describe('unfollowUser', () => {
    it('should unfollow a user successfully', async () => {
      const mockResponse = {
        success: true,
        followersCount: 0,
        followingCount: 0,
        isFollowing: false
      };

      vi.mocked(apiClient.delete).mockResolvedValueOnce(mockResponse);

      const result = await followService.unfollowUser('user-123');

      expect(apiClient.delete).toHaveBeenCalledWith('/follows', { userId: 'user-123' });
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(apiClient.delete).mockRejectedValueOnce(new Error('Network error'));

      await expect(followService.unfollowUser('user-123')).rejects.toThrow('Network error');
    });
  });

  describe('getFollowStatus', () => {
    it('should get follow status successfully', async () => {
      const mockResponse = {
        isFollowing: true,
        followersCount: 100,
        followingCount: 50
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const result = await followService.getFollowStatus('user-123');

      expect(apiClient.get).toHaveBeenCalledWith('/follows/user-123/status');
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network error'));

      await expect(followService.getFollowStatus('user-123')).rejects.toThrow('Network error');
    });
  });
});
