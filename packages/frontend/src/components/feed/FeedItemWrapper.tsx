import React, { useRef, useCallback } from 'react';
import { useFragment, graphql } from 'react-relay';
import type { FeedItemWrapper_post$key } from './__generated__/FeedItemWrapper_post.graphql';
import { PostCardRelay } from '../posts/PostCard';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import { useFeedItemAutoRead } from '../../hooks/useFeedItemAutoRead';

/**
 * Props for FeedItemWrapper component
 * Uses Relay fragment reference for type-safe data fetching
 */
export interface FeedItemWrapperProps {
  /** Relay fragment reference for post data */
  readonly post: FeedItemWrapper_post$key;
  /** Whether to display the post in compact mode (default: true) */
  readonly compact?: boolean;
}

/**
 * Wrapper component for PostCard with auto-read functionality using Relay
 *
 * Handles Instagram-like behavior where posts are marked as read after viewing.
 * Uses Relay fragment to fetch post data and pass fragment reference to PostCardRelay.
 * Combined with intersection observer to track visibility (70% visible for 1 second).
 *
 * @example
 * ```tsx
 * const data = useLazyLoadQuery(
 *   graphql`
 *     query ExampleQuery {
 *       post(id: "123") {
 *         ...FeedItemWrapper_post
 *       }
 *     }
 *   `,
 *   {}
 * );
 *
 * <FeedItemWrapper post={data.post} compact={true} />
 * ```
 *
 * TypeScript patterns applied:
 * - Fragment reference for type-safe Relay data
 * - Readonly modifier for immutable props
 * - Explicit interface for better error messages
 * - Optional properties with default values
 */
export const FeedItemWrapper: React.FC<FeedItemWrapperProps> = ({
  post: postRef,
  compact = true
}) => {
  // Extract post data from Relay fragment reference
  const post = useFragment(
    graphql`
      fragment FeedItemWrapper_post on Post {
        id
        ...PostCardRelay_post
      }
    `,
    postRef
  );

  const elementRef = useRef<HTMLDivElement | null>(null);
  const { markAsRead } = useFeedItemAutoRead();
  // Use ref instead of state to prevent race conditions
  const isMarkedAsReadRef = useRef(false);

  /**
   * Callback triggered when post meets visibility requirements
   * Marks the post as read via Relay mutation
   */
  const handleMarkAsRead = useCallback(() => {
    // Skip if already marked or invalid post ID
    if (isMarkedAsReadRef.current || !post.id || post.id.trim() === '') {
      return;
    }

    // Optimistically mark as read to prevent duplicate calls
    isMarkedAsReadRef.current = true;

    // Call Relay mutation to mark post as read
    markAsRead(post.id);
  }, [post.id, markAsRead]);

  // Use IntersectionObserver to detect when post is 70% visible for 1 second
  useIntersectionObserver(
    elementRef as React.RefObject<Element>,
    {
      threshold: 0.7,
      delay: 1000
    },
    handleMarkAsRead
  );

  return (
    <div ref={elementRef} className="feed-item-wrapper" data-testid="feed-item-wrapper">
      <PostCardRelay post={post} compact={compact} />
    </div>
  );
};
