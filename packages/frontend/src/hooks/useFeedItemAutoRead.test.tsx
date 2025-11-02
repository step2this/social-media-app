/**
 * useFeedItemAutoRead Relay Hook Tests
 *
 * Tests the useFeedItemAutoRead hook using Relay mutations with MockEnvironment.
 * Following TDD principles:
 * - Test behavior, not implementation
 * - Use existing fixtures from shared package
 * - Use existing test utilities (relay-test-utils.ts)
 * - No mocks/spies - use dependency injection via Relay
 * - Keep tests DRY - reuse patterns from existing Relay tests
 * - Minimal edge cases - focus on critical paths
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { RelayEnvironmentProvider } from 'react-relay';
import { createMockEnvironment, MockPayloadGenerator } from 'relay-test-utils';
import type { ReactNode } from 'react';
import { useFeedItemAutoRead } from './useFeedItemAutoRead';

describe('useFeedItemAutoRead (Relay)', () => {
  let environment: ReturnType<typeof createMockEnvironment>;

  beforeEach(() => {
    environment = createMockEnvironment();
  });

  /**
   * Wrapper component to provide Relay environment to hooks
   * Reusable pattern from existing Relay tests
   */
  const wrapper = ({ children }: { children: ReactNode }) => (
    <RelayEnvironmentProvider environment={environment}>
      {children}
    </RelayEnvironmentProvider>
  );

  /**
   * TEST 1: Basic behavior - mark single post as read
   * Critical path: Verify mutation is sent with correct variables
   */
  it('should mark a post as read when called', () => {
    const { result } = renderHook(() => useFeedItemAutoRead(), { wrapper });

    // Act - call the hook's function
    act(() => {
      result.current.markAsRead('post-123');
    });

    // Assert - verify mutation was sent with correct variables
    const operation = environment.mock.getMostRecentOperation();
    expect(operation.request.variables).toEqual({
      postIds: ['post-123'],
    });

    // Simulate successful response
    act(() => {
      environment.mock.resolveMostRecentOperation((operation) =>
        MockPayloadGenerator.generate(operation, {
          MarkFeedReadResponse: () => ({
            updatedCount: 1,
          }),
        })
      );
    });

    // No error should be present
    expect(result.current.error).toBeUndefined();
  });

  /**
   * TEST 2: Mark multiple posts as read (actual use case)
   * This is the real-world scenario where multiple posts need to be marked
   */
  it('should mark multiple posts as read', () => {
    const { result } = renderHook(() => useFeedItemAutoRead(), { wrapper });

    act(() => {
      result.current.markAsRead(['post-1', 'post-2', 'post-3']);
    });

    const operation = environment.mock.getMostRecentOperation();
    expect(operation.request.variables).toEqual({
      postIds: ['post-1', 'post-2', 'post-3'],
    });
  });

  /**
   * TEST 3: Error handling behavior
   * Verify that errors are captured gracefully without crashing
   */
  it('should handle errors gracefully', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useFeedItemAutoRead(), { wrapper });

    act(() => {
      result.current.markAsRead('post-123');
    });

    // Reject with error
    act(() => {
      environment.mock.rejectMostRecentOperation(new Error('Network error'));
    });

    // Wait for error state to be set
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    // Verify error was logged
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Failed to mark posts as read:',
      expect.any(Error)
    );

    consoleWarnSpy.mockRestore();
  });

  /**
   * TEST 4: In-flight state tracking
   * Verify that isInFlight is true during mutation
   */
  it('should track in-flight state during mutation', async () => {
    const { result } = renderHook(() => useFeedItemAutoRead(), { wrapper });

    expect(result.current.isInFlight).toBe(false);

    act(() => {
      result.current.markAsRead('post-123');
    });

    // Should be in-flight immediately after calling
    expect(result.current.isInFlight).toBe(true);

    // Resolve the mutation
    act(() => {
      environment.mock.resolveMostRecentOperation((operation) =>
        MockPayloadGenerator.generate(operation, {
          MarkFeedReadResponse: () => ({
            updatedCount: 1,
          }),
        })
      );
    });

    // Should no longer be in-flight after completion
    await waitFor(() => {
      expect(result.current.isInFlight).toBe(false);
    });
  });

  /**
   * TEST 5: Error state clears on successful mutation
   * After an error, a successful mutation should clear the error
   */
  it('should clear error state after successful mutation', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useFeedItemAutoRead(), { wrapper });

    // First call fails
    act(() => {
      result.current.markAsRead('post-123');
    });
    act(() => {
      environment.mock.rejectMostRecentOperation(new Error('Network error'));
    });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    // Second call succeeds
    act(() => {
      result.current.markAsRead('post-456');
    });
    act(() => {
      environment.mock.resolveMostRecentOperation((operation) =>
        MockPayloadGenerator.generate(operation, {
          MarkFeedReadResponse: () => ({
            updatedCount: 1,
          }),
        })
      );
    });

    // Error should be cleared
    await waitFor(() => {
      expect(result.current.error).toBeUndefined();
    });

    consoleWarnSpy.mockRestore();
  });
});
