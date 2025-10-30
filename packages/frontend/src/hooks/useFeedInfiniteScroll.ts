import { useRef, type RefObject } from 'react';
import { useIntersectionObserver } from './useIntersectionObserver';

/**
 * Custom hook for implementing infinite scroll functionality
 * 
 * Wraps the useIntersectionObserver hook to provide a simple
 * API for infinite scroll behavior in feed components.
 * 
 * @param loadMore - Callback to load more items
 * @param hasMore - Whether there are more items to load
 * @param isLoading - Whether items are currently being loaded
 * @returns Ref to attach to sentinel element
 * 
 * @example
 * ```tsx
 * const sentinelRef = useFeedInfiniteScroll(
 *   loadMore,
 *   hasMore,
 *   isLoading
 * );
 * 
 * return (
 *   <div>
 *     {items.map(item => <Item key={item.id} {...item} />)}
 *     {hasMore && <div ref={sentinelRef}>Loading...</div>}
 *   </div>
 * );
 * ```
 */
export const useFeedInfiniteScroll = (
  loadMore: () => Promise<void> | void,
  hasMore: boolean,
  isLoading: boolean
): RefObject<HTMLDivElement> => {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useIntersectionObserver(
    sentinelRef,
    {
      threshold: 0.1,
      delay: 0,
      rootMargin: '100px',
    },
    () => {
      if (hasMore && !isLoading) {
        loadMore();
      }
    }
  );

  return sentinelRef;
};
