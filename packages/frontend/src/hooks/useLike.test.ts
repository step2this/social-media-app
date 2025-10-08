import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLike } from './useLike.js';
import { likeService } from '../services/likeService.js';

vi.mock('../services/likeService');

describe('useLike', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useLike('post-123'));

      expect(result.current.isLiked).toBe(false);
      expect(result.current.likesCount).toBe(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should initialize with provided values', () => {
      const { result } = renderHook(() =>
        useLike('post-123', { initialIsLiked: true, initialLikesCount: 42 })
      );

      expect(result.current.isLiked).toBe(true);
      expect(result.current.likesCount).toBe(42);
    });
  });

  describe('likePost', () => {
    it('should like a post with optimistic update', async () => {
      const mockResponse = {
        success: true,
        likesCount: 43,
        isLiked: true
      };

      vi.mocked(likeService.likePost).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() =>
        useLike('post-123', { initialLikesCount: 42 })
      );

      // Optimistic update should happen immediately
      act(() => {
        result.current.likePost();
      });

      // Check optimistic state
      expect(result.current.isLiked).toBe(true);
      expect(result.current.likesCount).toBe(43);
      expect(result.current.isLoading).toBe(true);

      // Wait for API call to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify final state matches server response
      expect(result.current.isLiked).toBe(true);
      expect(result.current.likesCount).toBe(43);
      expect(result.current.error).toBeNull();
      expect(likeService.likePost).toHaveBeenCalledWith('post-123');
    });

    it('should rollback on error', async () => {
      vi.mocked(likeService.likePost).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() =>
        useLike('post-123', { initialLikesCount: 42, initialIsLiked: false })
      );

      // Attempt to like
      act(() => {
        result.current.likePost();
      });

      // Check optimistic state
      expect(result.current.isLiked).toBe(true);
      expect(result.current.likesCount).toBe(43);

      // Wait for error and rollback
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify rollback to original state
      expect(result.current.isLiked).toBe(false);
      expect(result.current.likesCount).toBe(42);
      expect(result.current.error).toBe('Failed to like post');
    });

    it('should not like if already liked', async () => {
      const { result } = renderHook(() =>
        useLike('post-123', { initialIsLiked: true })
      );

      act(() => {
        result.current.likePost();
      });

      expect(likeService.likePost).not.toHaveBeenCalled();
    });
  });

  describe('unlikePost', () => {
    it('should unlike a post with optimistic update', async () => {
      const mockResponse = {
        success: true,
        likesCount: 41,
        isLiked: false
      };

      vi.mocked(likeService.unlikePost).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() =>
        useLike('post-123', { initialIsLiked: true, initialLikesCount: 42 })
      );

      // Optimistic update should happen immediately
      act(() => {
        result.current.unlikePost();
      });

      // Check optimistic state
      expect(result.current.isLiked).toBe(false);
      expect(result.current.likesCount).toBe(41);
      expect(result.current.isLoading).toBe(true);

      // Wait for API call to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify final state
      expect(result.current.isLiked).toBe(false);
      expect(result.current.likesCount).toBe(41);
      expect(result.current.error).toBeNull();
      expect(likeService.unlikePost).toHaveBeenCalledWith('post-123');
    });

    it('should rollback on error', async () => {
      vi.mocked(likeService.unlikePost).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() =>
        useLike('post-123', { initialLikesCount: 42, initialIsLiked: true })
      );

      // Attempt to unlike
      act(() => {
        result.current.unlikePost();
      });

      // Check optimistic state
      expect(result.current.isLiked).toBe(false);
      expect(result.current.likesCount).toBe(41);

      // Wait for error and rollback
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify rollback to original state
      expect(result.current.isLiked).toBe(true);
      expect(result.current.likesCount).toBe(42);
      expect(result.current.error).toBe('Failed to unlike post');
    });

    it('should not unlike if not liked', async () => {
      const { result } = renderHook(() =>
        useLike('post-123', { initialIsLiked: false })
      );

      act(() => {
        result.current.unlikePost();
      });

      expect(likeService.unlikePost).not.toHaveBeenCalled();
    });
  });

  describe('toggleLike', () => {
    it('should call likePost when not liked', async () => {
      vi.mocked(likeService.likePost).mockResolvedValueOnce({
        success: true,
        likesCount: 1,
        isLiked: true
      });

      const { result } = renderHook(() =>
        useLike('post-123', { initialIsLiked: false })
      );

      act(() => {
        result.current.toggleLike();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(likeService.likePost).toHaveBeenCalledWith('post-123');
      expect(result.current.isLiked).toBe(true);
    });

    it('should call unlikePost when liked', async () => {
      vi.mocked(likeService.unlikePost).mockResolvedValueOnce({
        success: true,
        likesCount: 0,
        isLiked: false
      });

      const { result } = renderHook(() =>
        useLike('post-123', { initialIsLiked: true, initialLikesCount: 1 })
      );

      act(() => {
        result.current.toggleLike();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(likeService.unlikePost).toHaveBeenCalledWith('post-123');
      expect(result.current.isLiked).toBe(false);
    });
  });

  describe('fetchLikeStatus', () => {
    it('should fetch like status successfully', async () => {
      const mockResponse = {
        isLiked: true,
        likesCount: 42
      };

      vi.mocked(likeService.getLikeStatus).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useLike('post-123'));

      await act(async () => {
        await result.current.fetchLikeStatus();
      });

      expect(result.current.isLiked).toBe(true);
      expect(result.current.likesCount).toBe(42);
      expect(result.current.error).toBeNull();
      expect(likeService.getLikeStatus).toHaveBeenCalledWith('post-123');
    });

    it('should handle fetch errors', async () => {
      vi.mocked(likeService.getLikeStatus).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() => useLike('post-123'));

      await act(async () => {
        await result.current.fetchLikeStatus();
      });

      expect(result.current.error).toBe('Failed to fetch like status');
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      vi.mocked(likeService.likePost).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() => useLike('post-123'));

      // Trigger an error
      act(() => {
        result.current.likePost();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to like post');
      });

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
