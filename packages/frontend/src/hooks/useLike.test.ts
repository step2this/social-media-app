/**
 * useLike Hook Tests
 *
 * Tests the useLike hook using singleton injection pattern.
 * NO vi.mock() - uses setLikeService() for proper DI testing.
 *
 * Pattern: Inject MockGraphQLClient → LikeServiceGraphQL → setLikeService()
 * Best Practices: DRY helpers, type-safe assertions, clear test names
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLike } from './useLike.js';
import { setLikeService, resetLikeService } from '../services/likeService.js';
import { LikeServiceGraphQL } from '../services/implementations/LikeService.graphql.js';
import { MockGraphQLClient } from '../graphql/client.mock.js';
import {
  wrapInGraphQLError,
  createLikeResponse,
  createUnlikeResponse,
  createLikeStatusResponse,
} from '../services/__tests__/fixtures/graphqlFixtures.js';
import {
  createMockLikeResponse,
  createMockUnlikeResponse,
  createMockLikeStatus,
} from '../services/__tests__/fixtures/likeFixtures.js';

/**
 * Test Helpers - DRY utilities for common test patterns
 */

/** Helper to test error rollback */
async function testErrorRollback(
  action: () => void,
  originalState: { isLiked: boolean; likesCount: number },
  expectedError: string,
  result: any
) {
  action();

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.isLiked).toBe(originalState.isLiked);
  expect(result.current.likesCount).toBe(originalState.likesCount);
  expect(result.current.error).toBe(expectedError);
}

/** Helper to verify no API call was made */
function expectNoAPICall(mockClient: MockGraphQLClient, beforeCount: number) {
  expect(mockClient.mutateCalls.length).toBe(beforeCount);
}

/**
 * Main Test Suite
 */
describe('useLike', () => {
  let mockClient: MockGraphQLClient;
  let mockService: LikeServiceGraphQL;

  beforeEach(() => {
    mockClient = new MockGraphQLClient();
    mockService = new LikeServiceGraphQL(mockClient);
    setLikeService(mockService);
  });

  afterEach(() => {
    resetLikeService();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useLike('post-123'));

      expect(result.current).toMatchObject({
        isLiked: false,
        likesCount: 0,
        isLoading: false,
        error: null
      });
    });

    it('should initialize with provided values', () => {
      const { result } = renderHook(() =>
        useLike('post-123', { initialIsLiked: true, initialLikesCount: 42 })
      );

      expect(result.current).toMatchObject({
        isLiked: true,
        likesCount: 42
      });
    });
  });

  describe('likePost', () => {
    it('should like post with optimistic update then sync with server', async () => {
      mockClient.setMutationResponse(
        createLikeResponse(createMockLikeResponse({ likesCount: 43 }))
      );

      const { result } = renderHook(() =>
        useLike('post-123', { initialLikesCount: 42 })
      );

      // Perform optimistic update
      act(() => {
        result.current.likePost();
      });

      // Check optimistic state (immediate)
      expect(result.current.isLiked).toBe(true);
      expect(result.current.likesCount).toBe(43);
      expect(result.current.isLoading).toBe(true);

      // Wait for server sync
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify final state matches server
      expect(result.current).toMatchObject({
        isLiked: true,
        likesCount: 43,
        error: null
      });
    });

    it('should rollback optimistic update on error', async () => {
      mockClient.setMutationResponse(wrapInGraphQLError('Network error', 'NETWORK_ERROR'));

      const { result } = renderHook(() =>
        useLike('post-123', { initialLikesCount: 42, initialIsLiked: false })
      );

      await testErrorRollback(
        () => {
          act(() => {
            result.current.likePost();
          });
        },
        { isLiked: false, likesCount: 42 },
        'Failed to like post',
        result
      );
    });

    it('should not call API if already liked', () => {
      const { result } = renderHook(() =>
        useLike('post-123', { initialIsLiked: true })
      );

      const callsBefore = mockClient.mutateCalls.length;

      act(() => {
        result.current.likePost();
      });

      expectNoAPICall(mockClient, callsBefore);
    });
  });

  describe('unlikePost', () => {
    it('should unlike post with optimistic update then sync with server', async () => {
      mockClient.setMutationResponse(
        createUnlikeResponse(createMockUnlikeResponse({ likesCount: 41 }))
      );

      const { result } = renderHook(() =>
        useLike('post-123', { initialIsLiked: true, initialLikesCount: 42 })
      );

      // Perform optimistic update
      act(() => {
        result.current.unlikePost();
      });

      // Check optimistic state (immediate)
      expect(result.current.isLiked).toBe(false);
      expect(result.current.likesCount).toBe(41);
      expect(result.current.isLoading).toBe(true);

      // Wait for server sync
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify final state matches server
      expect(result.current).toMatchObject({
        isLiked: false,
        likesCount: 41,
        error: null
      });
    });

    it('should rollback optimistic update on error', async () => {
      mockClient.setMutationResponse(wrapInGraphQLError('Network error', 'NETWORK_ERROR'));

      const { result } = renderHook(() =>
        useLike('post-123', { initialLikesCount: 42, initialIsLiked: true })
      );

      await testErrorRollback(
        () => {
          act(() => {
            result.current.unlikePost();
          });
        },
        { isLiked: true, likesCount: 42 },
        'Failed to unlike post',
        result
      );
    });

    it('should not call API if not liked', () => {
      const { result } = renderHook(() =>
        useLike('post-123', { initialIsLiked: false })
      );

      const callsBefore = mockClient.mutateCalls.length;

      act(() => {
        result.current.unlikePost();
      });

      expectNoAPICall(mockClient, callsBefore);
    });
  });

  describe('toggleLike', () => {
    it('should toggle from not liked to liked', async () => {
      mockClient.setMutationResponse(
        createLikeResponse(createMockLikeResponse({ likesCount: 1 }))
      );

      const { result } = renderHook(() =>
        useLike('post-123', { initialIsLiked: false })
      );

      act(() => {
        result.current.toggleLike();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isLiked).toBe(true);
    });

    it('should toggle from liked to not liked', async () => {
      mockClient.setMutationResponse(
        createUnlikeResponse(createMockUnlikeResponse({ likesCount: 0 }))
      );

      const { result } = renderHook(() =>
        useLike('post-123', { initialIsLiked: true, initialLikesCount: 1 })
      );

      act(() => {
        result.current.toggleLike();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isLiked).toBe(false);
    });
  });

  describe('fetchLikeStatus', () => {
    it('should fetch and update like status from server', async () => {
      mockClient.setQueryResponse(
        createLikeStatusResponse(createMockLikeStatus({ isLiked: true, likesCount: 42 }))
      );

      const { result } = renderHook(() => useLike('post-123'));

      await act(async () => {
        await result.current.fetchLikeStatus();
      });

      expect(result.current).toMatchObject({
        isLiked: true,
        likesCount: 42,
        error: null
      });
    });

    it('should handle fetch errors gracefully', async () => {
      mockClient.setQueryResponse(wrapInGraphQLError('Network error', 'NETWORK_ERROR'));

      const { result } = renderHook(() => useLike('post-123'));

      await act(async () => {
        await result.current.fetchLikeStatus();
      });

      expect(result.current.error).toBe('Failed to fetch like status');
    });
  });

  describe('error handling', () => {
    it('should clear error state when clearError is called', async () => {
      mockClient.setMutationResponse(wrapInGraphQLError('Network error', 'NETWORK_ERROR'));

      const { result } = renderHook(() => useLike('post-123'));

      // Trigger error
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
