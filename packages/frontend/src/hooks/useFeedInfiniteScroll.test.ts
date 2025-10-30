import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { useFeedInfiniteScroll } from './useFeedInfiniteScroll';
import * as IntersectionObserverModule from './useIntersectionObserver';

/**
 * Test suite for useFeedInfiniteScroll hook
 * 
 * Tests the infinite scroll functionality including:
 * - Returns sentinel ref
 * - Calls loadMore when visible
 * - Respects hasMore flag
 * - Respects loading state
 */
describe('useFeedInfiniteScroll', () => {
  let mockLoadMore: Mock;
  let mockUseIntersectionObserver: Mock;

  beforeEach(() => {
    mockLoadMore = vi.fn();
    mockUseIntersectionObserver = vi.fn();
    vi.spyOn(IntersectionObserverModule, 'useIntersectionObserver').mockImplementation(mockUseIntersectionObserver);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Sentinel ref', () => {
    it('should return a ref object', () => {
      const { result } = renderHook(() =>
        useFeedInfiniteScroll(mockLoadMore, true, false)
      );

      expect(result.current).toHaveProperty('current');
      expect(result.current.current).toBeNull();
    });

    it('should return the same ref on re-renders', () => {
      const { result, rerender } = renderHook(
        ({ loadMore, hasMore, isLoading }) =>
          useFeedInfiniteScroll(loadMore, hasMore, isLoading),
        {
          initialProps: {
            loadMore: mockLoadMore,
            hasMore: true,
            isLoading: false,
          },
        }
      );

      const firstRef = result.current;

      rerender({ loadMore: mockLoadMore, hasMore: false, isLoading: false });

      const secondRef = result.current;

      expect(firstRef).toBe(secondRef);
    });
  });

  describe('IntersectionObserver setup', () => {
    it('should setup intersection observer with correct config', () => {
      renderHook(() => useFeedInfiniteScroll(mockLoadMore, true, false));

      expect(mockUseIntersectionObserver).toHaveBeenCalledWith(
        expect.objectContaining({ current: null }),
        { threshold: 0.1, delay: 0, rootMargin: '100px' },
        expect.any(Function)
      );
    });

    it('should pass loadMore callback to intersection observer', () => {
      renderHook(() => useFeedInfiniteScroll(mockLoadMore, true, false));

      const callback = mockUseIntersectionObserver.mock.calls[0][2];
      
      callback();

      expect(mockLoadMore).toHaveBeenCalledTimes(1);
    });

    it('should not call loadMore if hasMore is false', () => {
      renderHook(() => useFeedInfiniteScroll(mockLoadMore, false, false));

      const callback = mockUseIntersectionObserver.mock.calls[0][2];
      
      callback();

      expect(mockLoadMore).not.toHaveBeenCalled();
    });

    it('should not call loadMore if isLoading is true', () => {
      renderHook(() => useFeedInfiniteScroll(mockLoadMore, true, true));

      const callback = mockUseIntersectionObserver.mock.calls[0][2];
      
      callback();

      expect(mockLoadMore).not.toHaveBeenCalled();
    });

    it('should not call loadMore if both hasMore is false and isLoading is true', () => {
      renderHook(() => useFeedInfiniteScroll(mockLoadMore, false, true));

      const callback = mockUseIntersectionObserver.mock.calls[0][2];
      
      callback();

      expect(mockLoadMore).not.toHaveBeenCalled();
    });
  });

  describe('Re-rendering behavior', () => {
    it('should update callback when loadMore function changes', () => {
      const { rerender } = renderHook(
        ({ loadMore, hasMore, isLoading }) =>
          useFeedInfiniteScroll(loadMore, hasMore, isLoading),
        {
          initialProps: {
            loadMore: mockLoadMore,
            hasMore: true,
            isLoading: false,
          },
        }
      );

      const newLoadMore = vi.fn();
      rerender({ loadMore: newLoadMore, hasMore: true, isLoading: false });

      const callback = mockUseIntersectionObserver.mock.calls[mockUseIntersectionObserver.mock.calls.length - 1][2];
      
      callback();

      expect(newLoadMore).toHaveBeenCalledTimes(1);
      expect(mockLoadMore).not.toHaveBeenCalled();
    });

    it('should respect hasMore when it changes from true to false', () => {
      const { rerender } = renderHook(
        ({ loadMore, hasMore, isLoading }) =>
          useFeedInfiniteScroll(loadMore, hasMore, isLoading),
        {
          initialProps: {
            loadMore: mockLoadMore,
            hasMore: true,
            isLoading: false,
          },
        }
      );

      rerender({ loadMore: mockLoadMore, hasMore: false, isLoading: false });

      const callback = mockUseIntersectionObserver.mock.calls[mockUseIntersectionObserver.mock.calls.length - 1][2];
      
      callback();

      expect(mockLoadMore).not.toHaveBeenCalled();
    });

    it('should respect isLoading when it changes from false to true', () => {
      const { rerender } = renderHook(
        ({ loadMore, hasMore, isLoading }) =>
          useFeedInfiniteScroll(loadMore, hasMore, isLoading),
        {
          initialProps: {
            loadMore: mockLoadMore,
            hasMore: true,
            isLoading: false,
          },
        }
      );

      rerender({ loadMore: mockLoadMore, hasMore: true, isLoading: true });

      const callback = mockUseIntersectionObserver.mock.calls[mockUseIntersectionObserver.mock.calls.length - 1][2];
      
      callback();

      expect(mockLoadMore).not.toHaveBeenCalled();
    });
  });
});
