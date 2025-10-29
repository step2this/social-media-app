/**
 * useFollow Hook Tests
 *
 * Tests the useFollow hook using singleton injection pattern.
 * NO vi.mock() - uses setFollowService() for proper DI testing.
 *
 * Pattern: Inject MockGraphQLClient → FollowServiceGraphQL → setFollowService()
 * Best Practices: DRY helpers, type-safe assertions, clear test names
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFollow } from './useFollow.js';
import { setFollowService, resetFollowService } from '../services/followService.js';
import { FollowServiceGraphQL } from '../services/implementations/FollowService.graphql.js';
import { MockGraphQLClient } from '../graphql/client.mock.js';
import { wrapInGraphQLSuccess, wrapInGraphQLError } from '../services/__tests__/fixtures/graphqlFixtures.js';

/**
 * Test Helpers - DRY utilities for common test patterns
 */

/** Create a successful follow response */
const createFollowResponse = (overrides = {}) => wrapInGraphQLSuccess({
  followUser: {
    isFollowing: true,
    followersCount: 100,
    followingCount: 50,
    ...overrides
  }
});

/** Create a successful unfollow response */
const createUnfollowResponse = (overrides = {}) => wrapInGraphQLSuccess({
  unfollowUser: {
    isFollowing: false,
    followersCount: 99,
    followingCount: 50,
    ...overrides
  }
});

/** Create a successful follow status query response */
const createFollowStatusResponse = (overrides = {}) => wrapInGraphQLSuccess({
  followStatus: {
    isFollowing: true,
    followersCount: 100,
    followingCount: 50,
    ...overrides
  }
});

/** Helper to test optimistic updates with success */
async function testOptimisticUpdate(
  action: () => void,
  expectedOptimisticState: { isFollowing: boolean; followersCount: number },
  expectedFinalState: { isFollowing: boolean; followersCount: number }
) {
  return {
    checkOptimistic: () => {
      expect(expectedOptimisticState.isFollowing).toBeDefined();
      expect(expectedOptimisticState.followersCount).toBeDefined();
    },
    waitForCompletion: async (result: any) => {
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.isFollowing).toBe(expectedFinalState.isFollowing);
      expect(result.current.followersCount).toBe(expectedFinalState.followersCount);
      expect(result.current.error).toBeNull();
    }
  };
}

/** Helper to test error rollback */
async function testErrorRollback(
  action: () => void,
  originalState: { isFollowing: boolean; followersCount: number },
  expectedError: string,
  result: any
) {
  action();

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.isFollowing).toBe(originalState.isFollowing);
  expect(result.current.followersCount).toBe(originalState.followersCount);
  expect(result.current.error).toBe(expectedError);
}

/** Helper to verify no API call was made */
function expectNoAPICall(mockClient: MockGraphQLClient, beforeCount: number) {
  expect(mockClient.mutateCalls.length).toBe(beforeCount);
}

/**
 * Main Test Suite
 */
describe('useFollow', () => {
  let mockClient: MockGraphQLClient;
  let mockService: FollowServiceGraphQL;

  beforeEach(() => {
    mockClient = new MockGraphQLClient();
    mockService = new FollowServiceGraphQL(mockClient);
    setFollowService(mockService);
  });

  afterEach(() => {
    resetFollowService();
  });

  describe('initialization', () => {
    it('should initialize with default state (auto-fetches on mount)', () => {
      // Hook auto-fetches when no initial values provided
      mockClient.setQueryResponse(createFollowStatusResponse({ 
        isFollowing: false, 
        followersCount: 0,
        followingCount: 0
      }));

      const { result } = renderHook(() => useFollow('user-123'));

      // Initially loading
      expect(result.current.isLoading).toBe(true);
    });

    it('should initialize with provided values', () => {
      const { result } = renderHook(() =>
        useFollow('user-123', {
          initialIsFollowing: true,
          initialFollowersCount: 100,
          initialFollowingCount: 50
        })
      );

      expect(result.current).toMatchObject({
        isFollowing: true,
        followersCount: 100,
        followingCount: 50
      });
    });
  });

  describe('followUser', () => {
    it('should follow user with optimistic update then sync with server', async () => {
      mockClient.setMutationResponse(createFollowResponse());

      const { result } = renderHook(() =>
        useFollow('user-123', { initialFollowersCount: 99, initialIsFollowing: false })
      );

      // Perform optimistic update
      act(() => {
        result.current.followUser();
      });

      // Check optimistic state (immediate)
      expect(result.current.isFollowing).toBe(true);
      expect(result.current.followersCount).toBe(100);
      expect(result.current.isLoading).toBe(true);

      // Wait for server sync
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify final state matches server
      expect(result.current.isFollowing).toBe(true);
      expect(result.current.followersCount).toBe(100);
      expect(result.current.error).toBeNull();
    });

    it('should NOT invoke callback after successful follow (pure optimistic UI)', async () => {
      mockClient.setMutationResponse(createFollowResponse());
      const mockCallback = vi.fn();

      const { result } = renderHook(() =>
        useFollow('user-123', {
          initialFollowersCount: 99,
          onFollowStatusChange: mockCallback
        })
      );

      await act(async () => {
        await result.current.followUser();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should rollback optimistic update on error', async () => {
      mockClient.setMutationResponse(wrapInGraphQLError('Network error', 'NETWORK_ERROR'));

      const { result } = renderHook(() =>
        useFollow('user-123', { initialFollowersCount: 99, initialIsFollowing: false })
      );

      await testErrorRollback(
        () => {
          act(() => {
            result.current.followUser();
          });
        },
        { isFollowing: false, followersCount: 99 },
        'Failed to follow user',
        result
      );
    });

    it('should not call API if already following', () => {
      const { result } = renderHook(() =>
        useFollow('user-123', { initialIsFollowing: true })
      );

      const callsBefore = mockClient.mutateCalls.length;

      act(() => {
        result.current.followUser();
      });

      expectNoAPICall(mockClient, callsBefore);
    });
  });

  describe('unfollowUser', () => {
    it('should unfollow user with optimistic update then sync with server', async () => {
      mockClient.setMutationResponse(createUnfollowResponse());

      const { result } = renderHook(() =>
        useFollow('user-123', { initialIsFollowing: true, initialFollowersCount: 100 })
      );

      // Perform optimistic update
      act(() => {
        result.current.unfollowUser();
      });

      // Check optimistic state (immediate)
      expect(result.current.isFollowing).toBe(false);
      expect(result.current.followersCount).toBe(99);
      expect(result.current.isLoading).toBe(true);

      // Wait for server sync
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify final state matches server
      expect(result.current.isFollowing).toBe(false);
      expect(result.current.followersCount).toBe(99);
      expect(result.current.error).toBeNull();
    });

    it('should NOT invoke callback after successful unfollow (pure optimistic UI)', async () => {
      mockClient.setMutationResponse(createUnfollowResponse());
      const mockCallback = vi.fn();

      const { result } = renderHook(() =>
        useFollow('user-123', {
          initialIsFollowing: true,
          initialFollowersCount: 100,
          onFollowStatusChange: mockCallback
        })
      );

      await act(async () => {
        await result.current.unfollowUser();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should rollback optimistic update on error', async () => {
      mockClient.setMutationResponse(wrapInGraphQLError('Network error', 'NETWORK_ERROR'));

      const { result } = renderHook(() =>
        useFollow('user-123', { initialFollowersCount: 100, initialIsFollowing: true })
      );

      await testErrorRollback(
        () => {
          act(() => {
            result.current.unfollowUser();
          });
        },
        { isFollowing: true, followersCount: 100 },
        'Failed to unfollow user',
        result
      );
    });

    it('should not call API if not following', () => {
      const { result } = renderHook(() =>
        useFollow('user-123', { initialIsFollowing: false })
      );

      const callsBefore = mockClient.mutateCalls.length;

      act(() => {
        result.current.unfollowUser();
      });

      expectNoAPICall(mockClient, callsBefore);
    });
  });

  describe('toggleFollow', () => {
    it('should toggle from not following to following', async () => {
      mockClient.setMutationResponse(createFollowResponse({ followersCount: 1 }));

      const { result } = renderHook(() =>
        useFollow('user-123', { initialIsFollowing: false })
      );

      act(() => {
        result.current.toggleFollow();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isFollowing).toBe(true);
    });

    it('should toggle from following to not following', async () => {
      mockClient.setMutationResponse(createUnfollowResponse({ followersCount: 0 }));

      const { result } = renderHook(() =>
        useFollow('user-123', { initialIsFollowing: true, initialFollowersCount: 1 })
      );

      act(() => {
        result.current.toggleFollow();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isFollowing).toBe(false);
    });
  });

  describe('fetchFollowStatus', () => {
    it('should fetch and update follow status from server', async () => {
      mockClient.setQueryResponse(createFollowStatusResponse());

      const { result } = renderHook(() => 
        useFollow('user-123', { initialIsFollowing: false })
      );

      await act(async () => {
        await result.current.fetchFollowStatus();
      });

      expect(result.current).toMatchObject({
        isFollowing: true,
        followersCount: 100,
        followingCount: 50,
        error: null
      });
    });

    it('should handle fetch errors gracefully', async () => {
      mockClient.setQueryResponse(wrapInGraphQLError('Network error', 'NETWORK_ERROR'));

      const { result } = renderHook(() => 
        useFollow('user-123', { initialIsFollowing: false })
      );

      await act(async () => {
        await result.current.fetchFollowStatus();
      });

      expect(result.current.error).toBe('Failed to fetch follow status');
    });
  });

  describe('error handling', () => {
    it('should clear error state when clearError is called', async () => {
      mockClient.setMutationResponse(wrapInGraphQLError('Network error', 'NETWORK_ERROR'));

      const { result } = renderHook(() => useFollow('user-123'));

      // Trigger error
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
