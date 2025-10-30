import { useState, useCallback, useEffect } from 'react';
import { likeService } from '../services/likeService.js';

/**
 * Options for initializing useLike hook
 */
export interface UseLikeOptions {
  initialIsLiked?: boolean;
  initialLikesCount?: number;
}

/**
 * Hook for managing like state and operations for a post
 * Implements optimistic updates with rollback on error
 */
export const useLike = (
  postId: string,
  options: UseLikeOptions = {}
) => {
  const {
    initialIsLiked = false,
    initialLikesCount = 0
  } = options;

  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when initial values change (e.g., when post data loads)
  useEffect(() => {
    setIsLiked(initialIsLiked);
    setLikesCount(initialLikesCount);
  }, [initialIsLiked, initialLikesCount]);

  /**
   * Like a post with optimistic update
   */
  const likePost = useCallback(async () => {
    // Don't like if already liked
    if (isLiked) {
      return;
    }

    // Store original state for rollback
    const originalIsLiked = isLiked;
    const originalLikesCount = likesCount;

    // Optimistic update
    setIsLiked(true);
    setLikesCount(prev => prev + 1);
    setIsLoading(true);
    setError(null);

    try {
      const result = await likeService.likePost(postId);

      if (result.status === 'success') {
        // Confirm like status from server, but keep optimistic likesCount
        // (server returns 0 because stream processor updates count async)
        setIsLiked(result.data.isLiked);
        setIsLoading(false);
      } else {
        throw new Error('Failed to like post');
      }
    } catch (err) {
      // Rollback on error
      setIsLiked(originalIsLiked);
      setLikesCount(originalLikesCount);
      setError('Failed to like post');
      setIsLoading(false);
    }
  }, [postId, isLiked, likesCount]);

  /**
   * Unlike a post with optimistic update
   */
  const unlikePost = useCallback(async () => {
    // Don't unlike if not liked
    if (!isLiked) {
      return;
    }

    // Store original state for rollback
    const originalIsLiked = isLiked;
    const originalLikesCount = likesCount;

    // Optimistic update
    setIsLiked(false);
    setLikesCount(prev => prev - 1);
    setIsLoading(true);
    setError(null);

    try {
      const result = await likeService.unlikePost(postId);

      if (result.status === 'success') {
        // Confirm like status from server, but keep optimistic likesCount
        // (server returns 0 because stream processor updates count async)
        setIsLiked(result.data.isLiked);
        setIsLoading(false);
      } else {
        throw new Error('Failed to unlike post');
      }
    } catch (err) {
      // Rollback on error
      setIsLiked(originalIsLiked);
      setLikesCount(originalLikesCount);
      setError('Failed to unlike post');
      setIsLoading(false);
    }
  }, [postId, isLiked, likesCount]);

  /**
   * Toggle like status (convenience method)
   */
  const toggleLike = useCallback(async () => {
    if (isLiked) {
      await unlikePost();
    } else {
      await likePost();
    }
  }, [isLiked, likePost, unlikePost]);

  /**
   * Fetch current like status from server
   */
  const fetchLikeStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await likeService.getLikeStatus(postId);

      if (result.status === 'success') {
        setIsLiked(result.data.isLiked);
        setLikesCount(result.data.likesCount);
      } else if (result.status === 'error') {
        setError('Failed to fetch like status');
      }
        
      setIsLoading(false);
    } catch (err) {
      setError('Failed to fetch like status');
      setIsLoading(false);
    }
  }, [postId]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isLiked,
    likesCount,
    isLoading,
    error,

    // Actions
    likePost,
    unlikePost,
    toggleLike,
    fetchLikeStatus,
    clearError
  };
};
