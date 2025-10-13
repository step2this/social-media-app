import { useEffect, useRef, type RefObject } from 'react';

/**
 * Options for useIntersectionObserver hook
 */
export interface UseIntersectionObserverOptions {
  /**
   * Percentage of element that must be visible (0.0 to 1.0)
   * @default 0.0
   */
  threshold: number;

  /**
   * Delay in milliseconds before triggering callback
   * @default 0
   */
  delay: number;

  /**
   * Root element for intersection (null = viewport)
   * @default null
   */
  root?: Element | null;

  /**
   * Margin around root element
   * @default "0px"
   */
  rootMargin?: string;
}

/**
 * Custom hook to observe element visibility using IntersectionObserver API
 *
 * Triggers a callback when an element becomes visible above a specified threshold
 * for a specified duration. This is useful for tracking when users have actually
 * "seen" content (e.g., marking posts as read).
 *
 * @param elementRef - React ref to the element to observe
 * @param options - Configuration options for intersection detection
 * @param callback - Function to call when element is sufficiently visible
 *
 * @example
 * ```tsx
 * const FeedItem = ({ postId }) => {
 *   const ref = useRef<HTMLDivElement>(null);
 *
 *   useIntersectionObserver(
 *     ref,
 *     { threshold: 0.7, delay: 1000 },
 *     () => markPostAsRead(postId)
 *   );
 *
 *   return <div ref={ref}>Post content...</div>;
 * };
 * ```
 */
export function useIntersectionObserver(
  elementRef: RefObject<Element>,
  options: UseIntersectionObserverOptions,
  callback: () => void
): void {
  const { threshold, delay, root = null, rootMargin = '0px' } = options;

  // Store timeout ID to clear it if element leaves viewport
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Store callback in ref to avoid recreating observer on callback changes
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Create intersection observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Check if element is visible above threshold
          if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
            // Clear any existing timeout
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }

            // Set new timeout for callback
            if (delay > 0) {
              timeoutRef.current = setTimeout(() => {
                callbackRef.current();
              }, delay);
            } else {
              // No delay, call immediately
              callbackRef.current();
            }
          } else {
            // Element is not sufficiently visible, cancel pending callback
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
          }
        });
      },
      {
        root,
        rootMargin,
        threshold
      }
    );

    // Start observing
    observer.observe(element);

    // Cleanup
    return () => {
      observer.disconnect();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [elementRef, threshold, delay, root, rootMargin]);
}
