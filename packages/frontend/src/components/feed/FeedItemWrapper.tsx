import React from 'react';
import type { PostWithAuthor } from '@social-media-app/shared';
import { PostCard } from '../posts/PostCard';
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
 * Wrapper component for PostCard with auto-read functionality
 * 
 * Handles Instagram-like behavior where posts are marked as read after viewing.
 * Uses intersection observer via useFeedItemAutoRead hook to track visibility.
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
  const elementRef = useFeedItemAutoRead(post.id);

  return (
    <div ref={elementRef as React.RefObject<HTMLDivElement>} className="feed-item-wrapper" data-testid="feed-item-wrapper">
      <PostCard post={post} compact={compact} />
    </div>
  );
};
