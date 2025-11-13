/**
 * Post Server Actions Tests
 *
 * Unit tests for post-related Server Actions.
 * Tests error handling and successful responses.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { likePost, unlikePost } from '@/app/actions/posts';

// Mock dependencies
vi.mock('@/lib/graphql/client', () => ({
  getGraphQLClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { getGraphQLClient } from '@/lib/graphql/client';
import { revalidatePath } from 'next/cache';

describe('Post Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('likePost', () => {
    it('should return successful response when like succeeds', async () => {
      const mockClient = {
        request: vi.fn().mockResolvedValue({
          likePost: {
            success: true,
            likesCount: 11,
            isLiked: true,
          },
        }),
      };

      vi.mocked(getGraphQLClient).mockResolvedValue(mockClient as any);

      const result = await likePost('post-123');

      expect(result).toEqual({
        success: true,
        likesCount: 11,
        isLiked: true,
      });

      // Should call GraphQL client with correct parameters
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.anything(),
        { postId: 'post-123' }
      );

      // Should revalidate the feed
      expect(revalidatePath).toHaveBeenCalledWith('/(app)', 'layout');
    });

    it('should return error response when GraphQL request fails', async () => {
      const mockClient = {
        request: vi.fn().mockRejectedValue(new Error('Network error')),
      };

      vi.mocked(getGraphQLClient).mockResolvedValue(mockClient as any);

      const result = await likePost('post-123');

      expect(result).toEqual({
        success: false,
        likesCount: 0,
        isLiked: false,
      });

      // Should not revalidate on error
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('should return error response when client creation fails', async () => {
      vi.mocked(getGraphQLClient).mockRejectedValue(new Error('Auth error'));

      const result = await likePost('post-123');

      expect(result).toEqual({
        success: false,
        likesCount: 0,
        isLiked: false,
      });
    });
  });

  describe('unlikePost', () => {
    it('should return successful response when unlike succeeds', async () => {
      const mockClient = {
        request: vi.fn().mockResolvedValue({
          unlikePost: {
            success: true,
            likesCount: 9,
            isLiked: false,
          },
        }),
      };

      vi.mocked(getGraphQLClient).mockResolvedValue(mockClient as any);

      const result = await unlikePost('post-456');

      expect(result).toEqual({
        success: true,
        likesCount: 9,
        isLiked: false,
      });

      // Should call GraphQL client with correct parameters
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.anything(),
        { postId: 'post-456' }
      );

      // Should revalidate the feed
      expect(revalidatePath).toHaveBeenCalledWith('/(app)', 'layout');
    });

    it('should return error response when GraphQL request fails', async () => {
      const mockClient = {
        request: vi.fn().mockRejectedValue(new Error('Network error')),
      };

      vi.mocked(getGraphQLClient).mockResolvedValue(mockClient as any);

      const result = await unlikePost('post-456');

      expect(result).toEqual({
        success: false,
        likesCount: 0,
        isLiked: false,
      });

      // Should not revalidate on error
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('should return error response when client creation fails', async () => {
      vi.mocked(getGraphQLClient).mockRejectedValue(new Error('Auth error'));

      const result = await unlikePost('post-456');

      expect(result).toEqual({
        success: false,
        likesCount: 0,
        isLiked: false,
      });
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct return type for likePost', async () => {
      const mockClient = {
        request: vi.fn().mockResolvedValue({
          likePost: {
            success: true,
            likesCount: 10,
            isLiked: true,
          },
        }),
      };

      vi.mocked(getGraphQLClient).mockResolvedValue(mockClient as any);

      const result = await likePost('post-1');

      // TypeScript ensures these properties exist
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.likesCount).toBe('number');
      expect(typeof result.isLiked).toBe('boolean');
    });

    it('should enforce correct return type for unlikePost', async () => {
      const mockClient = {
        request: vi.fn().mockResolvedValue({
          unlikePost: {
            success: true,
            likesCount: 8,
            isLiked: false,
          },
        }),
      };

      vi.mocked(getGraphQLClient).mockResolvedValue(mockClient as any);

      const result = await unlikePost('post-1');

      // TypeScript ensures these properties exist
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.likesCount).toBe('number');
      expect(typeof result.isLiked).toBe('boolean');
    });
  });
});
