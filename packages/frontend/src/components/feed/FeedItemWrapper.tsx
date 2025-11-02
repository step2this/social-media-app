import React, { useRef, useCallback } from 'react';
import type { PostWithAuthor } from '@social-media-app/shared';
import { PostCard } from '../posts/PostCard';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import { useFeedItemAutoRead } from '../../hooks/useFeedItemAutoRead';

/**
 * Props for FeedItemWrapper component
 * Uses TypeScript best practices with explicit property types
 */
export interface FeedItemWrapperProps {
  /** Post data including author information */
  readonly post: PostWithAuthor;
  /** Whether to display the post in compact mode (default: true) */
  readonly compact?: boolean;
}

/**
 * Wrapper component for PostCard with auto-read functionality using Relay
 *
 * Handles Instagram-like behavior where posts are marked as read after viewing.
 * Uses Relay mutation for marking posts as read, combined with intersection observer
 * to track visibility (70% visible for 1 second).
 *
 * @example
 * ```tsx
 * <FeedItemWrapper post={post} compact={true} />
 * ```
 *
 * TypeScript patterns applied from SKILL.md:
 * - Readonly modifier for immutable props
 * - Explicit interface for better error messages
 * - Optional properties with default values
 * - JSDoc comments for documentation
 */
export const FeedItemWrapper: React.FC<FeedItemWrapperProps> = ({
  post,
  compact = true
}) => {
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
      <PostCard post={post} compact={compact} />
    </div>
  );
};
