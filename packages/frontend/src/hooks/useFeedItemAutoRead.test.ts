import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useFeedItemAutoRead } from './useFeedItemAutoRead';
import { feedService } from '../services/feedService';

// Mock dependencies
vi.mock('../services/feedService');
vi.mock('./useIntersectionObserver');

// Import the mocked hook to control its behavior
import * as useIntersectionObserverModule from './useIntersectionObserver';

describe('useFeedItemAutoRead', () => {
  let mockUseIntersectionObserver: ReturnType<typeof vi.fn>;

  beforeEach(() => {
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
    const mockResponse = { success: true, markedCount: 1 };
    vi.mocked(feedService.markPostsAsRead).mockResolvedValueOnce(mockResponse);

    renderHook(() => useFeedItemAutoRead('post-123'));

    // Trigger the intersection callback
    const callback = (mockUseIntersectionObserver as any).lastCallback;
    await act(async () => {
      await callback();
    });

    expect(feedService.markPostsAsRead).toHaveBeenCalledWith(['post-123']);
  });

  it('should only mark post as read once', async () => {
    const mockResponse = { success: true, markedCount: 1 };
    vi.mocked(feedService.markPostsAsRead).mockResolvedValue(mockResponse);

    renderHook(() => useFeedItemAutoRead('post-123'));

    const callback = (mockUseIntersectionObserver as any).lastCallback;

    // Trigger multiple times
    await act(async () => {
      await callback();
      await callback();
      await callback();
    });

    expect(feedService.markPostsAsRead).toHaveBeenCalledTimes(1);
  });

  it('should handle API errors gracefully without crashing', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(feedService.markPostsAsRead).mockRejectedValueOnce(new Error('Network error'));

    renderHook(() => useFeedItemAutoRead('post-123'));

    const callback = (mockUseIntersectionObserver as any).lastCallback;
    await act(async () => {
      await callback();
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should not make API call if already marked as read', async () => {
    const mockResponse = { success: true, markedCount: 1 };
    vi.mocked(feedService.markPostsAsRead).mockResolvedValue(mockResponse);

    const { rerender } = renderHook(() => useFeedItemAutoRead('post-123'));

    const callback = (mockUseIntersectionObserver as any).lastCallback;
    await act(async () => {
      await callback();
    });

    expect(feedService.markPostsAsRead).toHaveBeenCalledTimes(1);

    // Trigger again
    await act(async () => {
      await callback();
    });

    // Should still only be called once
    expect(feedService.markPostsAsRead).toHaveBeenCalledTimes(1);
  });

  it('should handle different post IDs separately', async () => {
    const mockResponse = { success: true, markedCount: 1 };
    vi.mocked(feedService.markPostsAsRead).mockResolvedValue(mockResponse);

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

    expect(feedService.markPostsAsRead).toHaveBeenCalledWith(['post-123']);
    expect(feedService.markPostsAsRead).toHaveBeenCalledWith(['post-456']);
    expect(feedService.markPostsAsRead).toHaveBeenCalledTimes(2);
  });

  it('should create unique refs for different post instances', () => {
    const { result: result1 } = renderHook(() => useFeedItemAutoRead('post-123'));
    const { result: result2 } = renderHook(() => useFeedItemAutoRead('post-456'));

    expect(result1.current).not.toBe(result2.current);
  });

  it('should log error but continue execution on API failure', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Failed to mark as read');
    vi.mocked(feedService.markPostsAsRead).mockRejectedValueOnce(error);

    renderHook(() => useFeedItemAutoRead('post-123'));

    const callback = (mockUseIntersectionObserver as any).lastCallback;
    await act(async () => {
      await callback();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to mark post as read:',
      'post-123',
      error
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
    expect(feedService.markPostsAsRead).not.toHaveBeenCalled();
  });
});
