import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIntersectionObserver } from './useIntersectionObserver';
import { useRef } from 'react';

/**
 * Mock IntersectionObserver API
 * This is necessary because jsdom doesn't provide IntersectionObserver
 */
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  private callback: IntersectionObserverCallback;
  private elements: Set<Element> = new Set();

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.thresholds = options?.threshold
      ? (Array.isArray(options.threshold) ? options.threshold : [options.threshold])
      : [0];

    // Store instance for testing
    MockIntersectionObserver.instances.push(this);
  }

  observe(target: Element): void {
    this.elements.add(target);
  }

  unobserve(target: Element): void {
    this.elements.delete(target);
  }

  disconnect(): void {
    this.elements.clear();
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  // Test helper to trigger intersection
  static triggerIntersection(
    target: Element,
    isIntersecting: boolean,
    intersectionRatio: number = 1
  ): void {
    const instance = this.instances.find(inst => inst.elements.has(target));
    if (instance) {
      const entry: IntersectionObserverEntry = {
        target,
        isIntersecting,
        intersectionRatio,
        time: Date.now(),
        boundingClientRect: target.getBoundingClientRect(),
        intersectionRect: target.getBoundingClientRect(),
        rootBounds: null,
      } as IntersectionObserverEntry;

      instance.callback([entry], instance);
    }
  }

  static instances: MockIntersectionObserver[] = [];
  static reset(): void {
    this.instances = [];
  }
}

describe('useIntersectionObserver', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockIntersectionObserver.reset();
    global.IntersectionObserver = MockIntersectionObserver as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  it('should create IntersectionObserver with correct threshold', () => {
    const callback = vi.fn();
    const mockElement = document.createElement('div');

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(mockElement);
      useIntersectionObserver(ref, { threshold: 0.7, delay: 0 }, callback);
      return ref;
    });

    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(MockIntersectionObserver.instances[0].thresholds).toEqual([0.7]);
  });

  it('should trigger callback when element is 70% visible', async () => {
    const callback = vi.fn();
    const mockElement = document.createElement('div');

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(mockElement);
      useIntersectionObserver(ref, { threshold: 0.7, delay: 0 }, callback);
      return ref;
    });

    // Simulate element becoming 70% visible
    MockIntersectionObserver.triggerIntersection(mockElement, true, 0.7);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should debounce callback for specified delay', async () => {
    const callback = vi.fn();
    const mockElement = document.createElement('div');

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(mockElement);
      useIntersectionObserver(ref, { threshold: 0.7, delay: 1000 }, callback);
      return ref;
    });

    // Simulate element becoming visible
    MockIntersectionObserver.triggerIntersection(mockElement, true, 0.7);

    // Callback should not be called immediately
    expect(callback).not.toHaveBeenCalled();

    // Fast-forward time by 500ms
    vi.advanceTimersByTime(500);
    expect(callback).not.toHaveBeenCalled();

    // Fast-forward remaining 500ms (total 1000ms)
    vi.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should cancel callback if element scrolls out of view before delay', () => {
    const callback = vi.fn();
    const mockElement = document.createElement('div');

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(mockElement);
      useIntersectionObserver(ref, { threshold: 0.7, delay: 1000 }, callback);
      return ref;
    });

    // Simulate element becoming visible
    MockIntersectionObserver.triggerIntersection(mockElement, true, 0.7);

    // Fast-forward 500ms
    vi.advanceTimersByTime(500);

    // Element scrolls out of view
    MockIntersectionObserver.triggerIntersection(mockElement, false, 0.3);

    // Fast-forward remaining time
    vi.advanceTimersByTime(500);

    // Callback should NOT be called because element left viewport
    expect(callback).not.toHaveBeenCalled();
  });

  it('should not trigger callback if threshold not met', () => {
    const callback = vi.fn();
    const mockElement = document.createElement('div');

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(mockElement);
      useIntersectionObserver(ref, { threshold: 0.7, delay: 0 }, callback);
      return ref;
    });

    // Simulate element only 50% visible (below 70% threshold)
    MockIntersectionObserver.triggerIntersection(mockElement, true, 0.5);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should handle multiple visibility state changes correctly', () => {
    const callback = vi.fn();
    const mockElement = document.createElement('div');

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(mockElement);
      useIntersectionObserver(ref, { threshold: 0.7, delay: 1000 }, callback);
      return ref;
    });

    // First intersection
    MockIntersectionObserver.triggerIntersection(mockElement, true, 0.7);
    vi.advanceTimersByTime(500);

    // Scrolls out
    MockIntersectionObserver.triggerIntersection(mockElement, false, 0.3);
    vi.advanceTimersByTime(500);

    // Scrolls back in
    MockIntersectionObserver.triggerIntersection(mockElement, true, 0.8);
    vi.advanceTimersByTime(1000);

    // Only the last intersection should trigger callback
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should disconnect observer on unmount', () => {
    const callback = vi.fn();
    const mockElement = document.createElement('div');
    const disconnectSpy = vi.spyOn(MockIntersectionObserver.prototype, 'disconnect');

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(mockElement);
      useIntersectionObserver(ref, { threshold: 0.7, delay: 0 }, callback);
      return ref;
    });

    unmount();

    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('should handle null ref gracefully', () => {
    const callback = vi.fn();

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      useIntersectionObserver(ref, { threshold: 0.7, delay: 0 }, callback);
      return ref;
    });

    // Should not throw error and observer should not be created for null element
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it('should allow delay of 0 for immediate callback', () => {
    const callback = vi.fn();
    const mockElement = document.createElement('div');

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(mockElement);
      useIntersectionObserver(ref, { threshold: 0.7, delay: 0 }, callback);
      return ref;
    });

    MockIntersectionObserver.triggerIntersection(mockElement, true, 0.7);

    // With delay: 0, callback should be immediate
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
