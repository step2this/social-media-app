/**
 * useFeedItemAutoRead Hook Tests
 *
 * Tests the useFeedItemAutoRead hook using singleton injection pattern for feedService.
 * NO vi.mock() for services - uses setFeedService() for proper DI testing.
 * DOES mock useIntersectionObserver (hook, not a service singleton).
 *
 * Pattern: Inject MockGraphQLClient → FeedServiceGraphQL → setFeedService()
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useFeedItemAutoRead } from './useFeedItemAutoRead';
import { setFeedService, resetFeedService } from '../services/feedService.js';
import { FeedServiceGraphQL } from '../services/implementations/FeedService.graphql.js';
import { MockGraphQLClient } from '../graphql/client.mock.js';
import { wrapInGraphQLSuccess, wrapInGraphQLError } from '../services/__tests__/fixtures/graphqlFixtures.js';

// Mock the useIntersectionObserver hook (not a service)
vi.mock('./useIntersectionObserver');

// Import the mocked hook to control its behavior
import * as useIntersectionObserverModule from './useIntersectionObserver';

describe('useFeedItemAutoRead', () => {
  let mockClient: MockGraphQLClient;
  let mockService: FeedServiceGraphQL;
  let mockUseIntersectionObserver: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create mock GraphQL client
    mockClient = new MockGraphQLClient();

    // Create service with mock client
    mockService = new FeedServiceGraphQL(mockClient);

    // Inject mock service into singleton
    setFeedService(mockService);

    // Mock useIntersectionObserver hook (not a service - ok to mock)
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Create a mock for useIntersectionObserver that captures the callback
    mockUseIntersectionObserver = vi.fn((ref, options, callback) => {
      // Store the callback so tests can trigger it
      (mockUseIntersectionObserver as any).lastCallback = callback;
    });

    vi.mocked(useIntersectionObserverModule.useIntersectionObserver).mockImplementation(
      mockUseIntersectionObserver
    );
  });

  afterEach(() => {
    // Cleanup singleton for next test
    resetFeedService();

    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  it('should return a ref object', () => {
    const { result } = renderHook(() => useFeedItemAutoRead('post-123'));

    expect(result.current).toBeDefined();
    expect(result.current).toHaveProperty('current');
  });

  it('should configure IntersectionObserver with 70% threshold and 1 second delay', () => {
    renderHook(() => useFeedItemAutoRead('post-123'));

    expect(mockUseIntersectionObserver).toHaveBeenCalledWith(
      expect.anything(), // ref
      { threshold: 0.7, delay: 1000 },
      expect.any(Function) // callback
    );
  });

  it('should mark post as read when visibility threshold is met', async () => {
    // Setup mock response using MockGraphQLClient
    mockClient.setMutationResponse(wrapInGraphQLSuccess({
      markPostsAsRead: {
        success: true,
        markedCount: 1
      }
    }));

    renderHook(() => useFeedItemAutoRead('post-123'));

    // Trigger the intersection callback
    const callback = (mockUseIntersectionObserver as any).lastCallback;
    await act(async () => {
      await callback();
    });

    // Verify service was called correctly
    expect(mockClient.mutateCalls).toHaveLength(1);
    expect(mockClient.mutateCalls[0].variables).toEqual({
      input: { postIds: ['post-123'] }
    });
  });

  it('should only mark post as read once', async () => {
    mockClient.setMutationResponse(wrapInGraphQLSuccess({
      markPostsAsRead: {
        success: true,
        markedCount: 1
      }
    }));

    renderHook(() => useFeedItemAutoRead('post-123'));

    const callback = (mockUseIntersectionObserver as any).lastCallback;

    // Trigger multiple times
    await act(async () => {
      await callback();
      await callback();
      await callback();
    });

    // Should only call mutation once (idempotent)
    expect(mockClient.mutateCalls).toHaveLength(1);
  });

  it('should handle API errors gracefully without crashing', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockClient.setMutationResponse(wrapInGraphQLError('Network error', 'NETWORK_ERROR'));

    renderHook(() => useFeedItemAutoRead('post-123'));

    const callback = (mockUseIntersectionObserver as any).lastCallback;
    await act(async () => {
      await callback();
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should not make API call if already marked as read', async () => {
    mockClient.setMutationResponse(wrapInGraphQLSuccess({
      markPostsAsRead: {
        success: true,
        markedCount: 1
      }
    }));

    const { rerender } = renderHook(() => useFeedItemAutoRead('post-123'));

    const callback = (mockUseIntersectionObserver as any).lastCallback;
    await act(async () => {
      await callback();
    });

    expect(mockClient.mutateCalls).toHaveLength(1);

    // Trigger again
    await act(async () => {
      await callback();
    });

    // Should still only be called once (idempotent)
    expect(mockClient.mutateCalls).toHaveLength(1);
  });

  it('should handle different post IDs separately', async () => {
    mockClient.setMutationResponse(wrapInGraphQLSuccess({
      markPostsAsRead: {
        success: true,
        markedCount: 1
      }
    }));

    // First post
    const { result: result1 } = renderHook(() => useFeedItemAutoRead('post-123'));
    const callback1 = (mockUseIntersectionObserver as any).lastCallback;

    // Second post
    const { result: result2 } = renderHook(() => useFeedItemAutoRead('post-456'));
    const callback2 = (mockUseIntersectionObserver as any).lastCallback;

    await act(async () => {
      await callback1();
      await callback2();
    });

    // Should have called mutation twice with different post IDs
    expect(mockClient.mutateCalls).toHaveLength(2);
    expect(mockClient.mutateCalls[0].variables).toEqual({
      input: { postIds: ['post-123'] }
    });
    expect(mockClient.mutateCalls[1].variables).toEqual({
      input: { postIds: ['post-456'] }
    });
  });

  it('should create unique refs for different post instances', () => {
    const { result: result1 } = renderHook(() => useFeedItemAutoRead('post-123'));
    const { result: result2 } = renderHook(() => useFeedItemAutoRead('post-456'));

    expect(result1.current).not.toBe(result2.current);
  });

  it('should log error but continue execution on API failure', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockClient.setMutationResponse(wrapInGraphQLError('Failed to mark as read', 'OPERATION_FAILED'));

    renderHook(() => useFeedItemAutoRead('post-123'));

    const callback = (mockUseIntersectionObserver as any).lastCallback;
    await act(async () => {
      await callback();
    });

    // Should log error with post ID
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to mark post as read:',
      'post-123',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it('should handle unmount gracefully', () => {
    const { unmount } = renderHook(() => useFeedItemAutoRead('post-123'));

    // Should not throw
    expect(() => unmount()).not.toThrow();
  });

  it('should not call API with empty or invalid post IDs', async () => {
    const { result: result1 } = renderHook(() => useFeedItemAutoRead(''));
    const callback1 = (mockUseIntersectionObserver as any).lastCallback;

    // Should not throw, but should not call API
    callback1();

    await vi.runAllTimersAsync();

    // API should not be called for empty string
    expect(mockClient.mutateCalls).toHaveLength(0);
  });
});
