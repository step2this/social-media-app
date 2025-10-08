import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFollow } from './useFollow.js';
import { followService } from '../services/followService.js';

vi.mock('../services/followService');

describe('useFollow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useFollow('user-123'));

      expect(result.current.isFollowing).toBe(false);
      expect(result.current.followersCount).toBe(0);
      expect(result.current.followingCount).toBe(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should initialize with provided values', () => {
      const { result } = renderHook(() =>
        useFollow('user-123', {
          initialIsFollowing: true,
          initialFollowersCount: 100,
          initialFollowingCount: 50
        })
      );

      expect(result.current.isFollowing).toBe(true);
      expect(result.current.followersCount).toBe(100);
      expect(result.current.followingCount).toBe(50);
    });
  });

  describe('followUser', () => {
    it('should follow a user with optimistic update', async () => {
      const mockResponse = {
        success: true,
        followersCount: 0,
        followingCount: 0,
        isFollowing: true
      };

      vi.mocked(followService.followUser).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() =>
        useFollow('user-123', { initialFollowersCount: 99 })
      );

      // Optimistic update should happen immediately
      act(() => {
        result.current.followUser();
      });

      // Check optimistic state
      expect(result.current.isFollowing).toBe(true);
      expect(result.current.followersCount).toBe(100);
      expect(result.current.isLoading).toBe(true);

      // Wait for API call to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify final state matches server response
      expect(result.current.isFollowing).toBe(true);
      expect(result.current.followersCount).toBe(100);
      expect(result.current.error).toBeNull();
      expect(followService.followUser).toHaveBeenCalledWith('user-123');
    });

    it('should rollback on error', async () => {
      vi.mocked(followService.followUser).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() =>
        useFollow('user-123', { initialFollowersCount: 99, initialIsFollowing: false })
      );

      // Attempt to follow
      act(() => {
        result.current.followUser();
      });

      // Check optimistic state
      expect(result.current.isFollowing).toBe(true);
      expect(result.current.followersCount).toBe(100);

      // Wait for error and rollback
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify rollback to original state
      expect(result.current.isFollowing).toBe(false);
      expect(result.current.followersCount).toBe(99);
      expect(result.current.error).toBe('Failed to follow user');
    });

    it('should not follow if already following', async () => {
      const { result } = renderHook(() =>
        useFollow('user-123', { initialIsFollowing: true })
      );

      act(() => {
        result.current.followUser();
      });

      expect(followService.followUser).not.toHaveBeenCalled();
    });
  });

  describe('unfollowUser', () => {
    it('should unfollow a user with optimistic update', async () => {
      const mockResponse = {
        success: true,
        followersCount: 0,
        followingCount: 0,
        isFollowing: false
      };

      vi.mocked(followService.unfollowUser).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() =>
        useFollow('user-123', { initialIsFollowing: true, initialFollowersCount: 100 })
      );

      // Optimistic update should happen immediately
      act(() => {
        result.current.unfollowUser();
      });

      // Check optimistic state
      expect(result.current.isFollowing).toBe(false);
      expect(result.current.followersCount).toBe(99);
      expect(result.current.isLoading).toBe(true);

      // Wait for API call to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify final state
      expect(result.current.isFollowing).toBe(false);
      expect(result.current.followersCount).toBe(99);
      expect(result.current.error).toBeNull();
      expect(followService.unfollowUser).toHaveBeenCalledWith('user-123');
    });

    it('should rollback on error', async () => {
      vi.mocked(followService.unfollowUser).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() =>
        useFollow('user-123', { initialFollowersCount: 100, initialIsFollowing: true })
      );

      // Attempt to unfollow
      act(() => {
        result.current.unfollowUser();
      });

      // Check optimistic state
      expect(result.current.isFollowing).toBe(false);
      expect(result.current.followersCount).toBe(99);

      // Wait for error and rollback
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify rollback to original state
      expect(result.current.isFollowing).toBe(true);
      expect(result.current.followersCount).toBe(100);
      expect(result.current.error).toBe('Failed to unfollow user');
    });

    it('should not unfollow if not following', async () => {
      const { result } = renderHook(() =>
        useFollow('user-123', { initialIsFollowing: false })
      );

      act(() => {
        result.current.unfollowUser();
      });

      expect(followService.unfollowUser).not.toHaveBeenCalled();
    });
  });

  describe('toggleFollow', () => {
    it('should call followUser when not following', async () => {
      vi.mocked(followService.followUser).mockResolvedValueOnce({
        success: true,
        followersCount: 0,
        followingCount: 0,
        isFollowing: true
      });

      const { result } = renderHook(() =>
        useFollow('user-123', { initialIsFollowing: false })
      );

      act(() => {
        result.current.toggleFollow();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(followService.followUser).toHaveBeenCalledWith('user-123');
      expect(result.current.isFollowing).toBe(true);
    });

    it('should call unfollowUser when following', async () => {
      vi.mocked(followService.unfollowUser).mockResolvedValueOnce({
        success: true,
        followersCount: 0,
        followingCount: 0,
        isFollowing: false
      });

      const { result } = renderHook(() =>
        useFollow('user-123', { initialIsFollowing: true, initialFollowersCount: 1 })
      );

      act(() => {
        result.current.toggleFollow();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(followService.unfollowUser).toHaveBeenCalledWith('user-123');
      expect(result.current.isFollowing).toBe(false);
    });
  });

  describe('fetchFollowStatus', () => {
    it('should fetch follow status successfully', async () => {
      const mockResponse = {
        isFollowing: true,
        followersCount: 100,
        followingCount: 50
      };

      vi.mocked(followService.getFollowStatus).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useFollow('user-123'));

      await act(async () => {
        await result.current.fetchFollowStatus();
      });

      expect(result.current.isFollowing).toBe(true);
      expect(result.current.followersCount).toBe(100);
      expect(result.current.followingCount).toBe(50);
      expect(result.current.error).toBeNull();
      expect(followService.getFollowStatus).toHaveBeenCalledWith('user-123');
    });

    it('should handle fetch errors', async () => {
      vi.mocked(followService.getFollowStatus).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() => useFollow('user-123'));

      await act(async () => {
        await result.current.fetchFollowStatus();
      });

      expect(result.current.error).toBe('Failed to fetch follow status');
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      vi.mocked(followService.followUser).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() => useFollow('user-123'));

      // Trigger an error
      act(() => {
        result.current.followUser();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to follow user');
      });

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
