import { useRef, useCallback, type RefObject } from 'react';
import { useIntersectionObserver } from './useIntersectionObserver';
import { feedService } from '../services/feedService.js';

/**
 * Custom hook to automatically mark a feed post as read
 *
 * Implements Instagram-like behavior where posts are marked as read after
 * being 70% visible for 1 second. The post is only marked once, and any
 * errors are logged but don't disrupt the user experience.
 *
 * @param postId - The ID of the post to track
 * @returns RefObject to attach to the post element
 *
 * @example
 * ```tsx
 * const FeedItem = ({ post }) => {
 *   const ref = useFeedItemAutoRead(post.id);
 *
 *   return (
 *     <div ref={ref}>
 *       <PostContent post={post} />
 *     </div>
 *   );
 * };
 * ```
 */
export function useFeedItemAutoRead(postId: string): RefObject<HTMLDivElement | null> {
  const elementRef = useRef<HTMLDivElement | null>(null);
  // Use ref instead of state to prevent race conditions
  const isMarkedAsReadRef = useRef(false);

  /**
   * Callback triggered when post meets visibility requirements
   * Marks the post as read via API call
   */
  const handleMarkAsRead = useCallback(async () => {
    // Skip if already marked or invalid post ID
    if (isMarkedAsReadRef.current || !postId || postId.trim() === '') {
      return;
    }

    // Optimistically mark as read to prevent duplicate calls
    isMarkedAsReadRef.current = true;

    const result = await feedService.markPostsAsRead({ postIds: [postId] });
    
    // Check for errors using AsyncState pattern
    if (result.status === 'error') {
      // Log error but don't disrupt user experience
      console.error('Failed to mark post as read:', postId, new Error(result.error.message));

      // Revert optimistic update on failure
      isMarkedAsReadRef.current = false;
    }
  }, [postId]);

  // Use IntersectionObserver to detect when post is 70% visible for 1 second
  useIntersectionObserver(
    elementRef as RefObject<Element>,
    {
      threshold: 0.7,
      delay: 1000
    },
    handleMarkAsRead
  );

  return elementRef;
}
