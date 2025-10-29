/**
 * useFollow Hook Tests
 *
 * Tests the useFollow hook using singleton injection pattern.
 * NO vi.mock() - uses setFollowService() for proper DI testing.
 *
 * Pattern: Inject MockGraphQLClient → FollowServiceGraphQL → setFollowService()
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFollow } from './useFollow.js';
import { setFollowService, resetFollowService } from '../services/followService.js';
import { FollowServiceGraphQL } from '../services/implementations/FollowService.graphql.js';
import { MockGraphQLClient } from '../graphql/client.mock.js';
import { wrapInGraphQLSuccess, wrapInGraphQLError } from '../services/__tests__/fixtures/graphqlFixtures.js';

describe('useFollow', () => {
  let mockClient: MockGraphQLClient;
  let mockService: FollowServiceGraphQL;

  beforeEach(() => {
    // Create mock GraphQL client
    mockClient = new MockGraphQLClient();
    
    // Create service with mock client
    mockService = new FollowServiceGraphQL(mockClient);
    
    // Inject mock service into singleton
    setFollowService(mockService);
  });

  afterEach(() => {
    // Cleanup singleton for next test
    resetFollowService();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useFollow('user-123'));

      expect(result.current.isFollowing).toBe(false);
      expect(result.current.followersCount).toBe(0);
      expect(result.current.followingCount).toBe(0);
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
      // Setup mock response
      mockClient.setMutationResponse(wrapInGraphQLSuccess({
        followUser: {
          isFollowing: true,
          followersCount: 100, // Server returns actual count
          followingCount: 50
        }
      }));

      const { result } = renderHook(() =>
        useFollow('user-123', { initialFollowersCount: 99, initialIsFollowing: false })
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
    });

    it('should NOT call onFollowStatusChange callback after successful follow', async () => {
      mockClient.setMutationResponse(wrapInGraphQLSuccess({
        followUser: {
          isFollowing: true,
          followersCount: 100,
          followingCount: 50
        }
      }));

      const mockCallback = vi.fn();
      const { result } = renderHook(() =>
        useFollow('user-123', {
          initialFollowersCount: 99,
          onFollowStatusChange: mockCallback
        })
      );

      // Follow the user
      await act(async () => {
        await result.current.followUser();
      });

      // Wait for API call to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Callback should NOT be invoked (pure optimistic UI)
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      mockClient.setMutationResponse(wrapInGraphQLError('Network error', 'NETWORK_ERROR'));

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

      // Track mutation calls
      const mutationCallsBefore = mockClient.mutateCalls.length;

      act(() => {
        result.current.followUser();
      });

      // Should not make API call
      const mutationCallsAfter = mockClient.mutateCalls.length;
      expect(mutationCallsAfter).toBe(mutationCallsBefore);
    });
  });

  describe('unfollowUser', () => {
    it('should unfollow a user with optimistic update', async () => {
      mockClient.setMutationResponse(wrapInGraphQLSuccess({
        unfollowUser: {
          isFollowing: false,
          followersCount: 99,
          followingCount: 50
        }
      }));

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
    });

    it('should NOT call onFollowStatusChange callback after successful unfollow', async () => {
      mockClient.setMutationResponse(wrapInGraphQLSuccess({
        unfollowUser: {
          isFollowing: false,
          followersCount: 99,
          followingCount: 50
        }
      }));

      const mockCallback = vi.fn();
      const { result } = renderHook(() =>
        useFollow('user-123', {
          initialIsFollowing: true,
          initialFollowersCount: 100,
          onFollowStatusChange: mockCallback
        })
      );

      // Unfollow the user
      await act(async () => {
        await result.current.unfollowUser();
      });

      // Wait for API call to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Callback should NOT be invoked (pure optimistic UI)
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      mockClient.setMutationResponse(wrapInGraphQLError('Network error', 'NETWORK_ERROR'));

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

      // Track mutation calls
      const mutationCallsBefore = mockClient.mutateCalls.length;

      act(() => {
        result.current.unfollowUser();
      });

      // Should not make API call
      const mutationCallsAfter = mockClient.mutateCalls.length;
      expect(mutationCallsAfter).toBe(mutationCallsBefore);
    });
  });

  describe('toggleFollow', () => {
    it('should call followUser when not following', async () => {
      mockClient.setMutationResponse(wrapInGraphQLSuccess({
        followUser: {
          isFollowing: true,
          followersCount: 1,
          followingCount: 50
        }
      }));

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

    it('should call unfollowUser when following', async () => {
      mockClient.setMutationResponse(wrapInGraphQLSuccess({
        unfollowUser: {
          isFollowing: false,
          followersCount: 0,
          followingCount: 50
        }
      }));

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
    it('should fetch follow status successfully', async () => {
      mockClient.setQueryResponse(wrapInGraphQLSuccess({
        followStatus: {
          isFollowing: true,
          followersCount: 100,
          followingCount: 50
        }
      }));

      // Provide initial values to prevent auto-fetch on mount
      const { result } = renderHook(() => useFollow('user-123', { initialIsFollowing: false }));

      await act(async () => {
        await result.current.fetchFollowStatus();
      });

      expect(result.current.isFollowing).toBe(true);
      expect(result.current.followersCount).toBe(100);
      expect(result.current.followingCount).toBe(50);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch errors', async () => {
      mockClient.setQueryResponse(wrapInGraphQLError('Network error', 'NETWORK_ERROR'));

      // Provide initial values to prevent auto-fetch on mount
      const { result } = renderHook(() => useFollow('user-123', { initialIsFollowing: false }));

      await act(async () => {
        await result.current.fetchFollowStatus();
      });

      expect(result.current.error).toBe('Failed to fetch follow status');
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      mockClient.setMutationResponse(wrapInGraphQLError('Network error', 'NETWORK_ERROR'));

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
