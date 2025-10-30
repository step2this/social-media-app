import React from 'react';
import type { PostWithAuthor } from '@social-media-app/shared';
import { FeedItemWrapper } from './FeedItemWrapper';

/**
 * Props for FeedList component
 * 
 * TypeScript patterns from SKILL.md:
 * - Readonly modifier for immutable collections
 * - ReadonlyArray ensures posts cannot be mutated
 */
export interface FeedListProps {
  /** Array of posts to display in the feed */
  readonly posts: readonly PostWithAuthor[];
  /** Whether to display posts in compact mode (default: true) */
  readonly compact?: boolean;
}

/**
 * Feed list component that renders a collection of posts
 * 
 * Uses TypeScript advanced patterns:
 * - Readonly arrays for immutability
 * - Type-safe iteration with proper key handling
 * - Generic-free design (uses concrete types for clarity)
 * 
 * @example
 * ```tsx
 * <FeedList posts={posts} compact={true} />
 * ```
 * 
 * TypeScript patterns applied from SKILL.md:
 * - Readonly modifiers prevent unintended mutations
 * - Explicit interfaces for better error messages
 * - JSDoc comments for documentation
 * - Const assertions where appropriate
 */
export const FeedList: React.FC<FeedListProps> = ({ 
  posts, 
  compact = true 
}) => {
  return (
    <div className="feed-list" data-testid="feed-list">
      {posts.map((post) => (
        <FeedItemWrapper key={post.id} post={post} compact={compact} />
      ))}
    </div>
  );
};
