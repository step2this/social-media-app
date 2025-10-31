/**
 * Relay Data Transformers
 *
 * Type-safe utilities for transforming Relay query data to domain types.
 * Uses advanced TypeScript patterns:
 * - Generics with constraints
 * - Mapped types
 * - Utility types (Pick, Omit, Partial, etc.)
 * - Type inference
 * - Conditional types
 *
 * Benefits:
 * - Single source of truth for transformations
 * - Type safety at compile time
 * - Reusable across HomePage, ExplorePage, PostDetailPage
 * - No `any` types
 */

import type { PostWithAuthor, PostGridItem } from '@social-media-app/shared';

/**
 * Relay Post Node (extract common shape from generated types)
 *
 * This is the shape that Relay queries return for posts.
 * It's a subset of the GraphQL Post type with author nested.
 */
export interface RelayPostNode {
  readonly id: string;
  readonly userId: string;
  readonly caption: string | null | undefined;
  readonly imageUrl: string;
  readonly thumbnailUrl: string;
  readonly likesCount: number;
  readonly commentsCount: number;
  readonly isLiked?: boolean | null | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly author: {
    readonly id: string;
    readonly handle: string;
    readonly username: string;
    readonly fullName: string | null | undefined;
    readonly profilePictureUrl: string | null | undefined;
  };
}

/**
 * Relay Post Edge (Relay Connection pattern)
 */
export interface RelayPostEdge {
  readonly node: RelayPostNode;
  readonly cursor: string;
}

/**
 * Transform Relay post node to PostWithAuthor domain type
 *
 * This is the main transformation function that converts Relay GraphQL
 * data to our domain type expected by existing components.
 *
 * Pattern: Explicit mapping with null handling and type safety
 *
 * @param node - Relay post node from query
 * @returns PostWithAuthor domain object
 */
export function relayPostToPostWithAuthor(node: RelayPostNode): PostWithAuthor {
  return {
    // Post fields
    id: node.id,
    userId: node.userId,
    userHandle: node.author.handle,
    imageUrl: node.imageUrl,
    caption: node.caption ?? undefined, // Convert null to undefined
    likesCount: node.likesCount,
    commentsCount: node.commentsCount,
    createdAt: node.createdAt,

    // Author fields (denormalized for performance)
    authorId: node.userId,
    authorHandle: node.author.handle,
    authorFullName: node.author.fullName,
    authorProfilePictureUrl: node.author.profilePictureUrl ?? undefined,

    // Feed-specific fields
    isLiked: node.isLiked ?? false,

    // Not provided by Relay query (optional fields)
    isRead: undefined,
    readAt: undefined,
    source: undefined,
  };
}

/**
 * Transform Relay post node to PostGridItem (for ExplorePage)
 *
 * PostGridItem is a lighter weight type for grid display.
 * It only includes fields needed for thumbnails.
 *
 * @param node - Relay post node from query
 * @returns PostGridItem for grid display
 */
export function relayPostToPostGridItem(node: RelayPostNode): PostGridItem {
  return {
    id: node.id,
    userId: node.userId,
    userHandle: node.author.handle,
    thumbnailUrl: node.thumbnailUrl,
    caption: node.caption ?? undefined,
    likesCount: node.likesCount,
    commentsCount: node.commentsCount,
    createdAt: node.createdAt,
  };
}

/**
 * Generic transformer for arrays of posts
 *
 * Uses TypeScript generics to allow transforming to either
 * PostWithAuthor or PostGridItem based on the transformer function.
 *
 * Pattern from SKILL.md: Generic constraints with function parameters
 *
 * @param edges - Array of Relay edges
 * @param transformer - Function to transform each node
 * @returns Array of transformed domain objects
 *
 * @example
 * ```typescript
 * // Transform to PostWithAuthor[]
 * const posts = transformRelayEdges(
 *   data.followingFeed.edges,
 *   relayPostToPostWithAuthor
 * );
 *
 * // Transform to PostGridItem[]
 * const gridItems = transformRelayEdges(
 *   data.exploreFeed.edges,
 *   relayPostToPostGridItem
 * );
 * ```
 */
export function transformRelayEdges<TNode extends RelayPostNode, TResult>(
  edges: ReadonlyArray<{ readonly node: TNode }>,
  transformer: (node: TNode) => TResult
): TResult[] {
  return edges.map(edge => transformer(edge.node));
}

/**
 * Type guard: Check if a node has all required PostWithAuthor fields
 *
 * Useful for runtime validation in tests or when dealing with
 * partial Relay data.
 *
 * Pattern from SKILL.md: Type guards with `is` keyword
 */
export function isCompletePostNode(node: unknown): node is RelayPostNode {
  if (typeof node !== 'object' || node === null) return false;

  const candidate = node as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.userId === 'string' &&
    typeof candidate.imageUrl === 'string' &&
    typeof candidate.thumbnailUrl === 'string' &&
    typeof candidate.likesCount === 'number' &&
    typeof candidate.commentsCount === 'number' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.author === 'object' &&
    candidate.author !== null
  );
}

/**
 * Helper: Extract post IDs from Relay edges
 *
 * Common operation for tracking which posts are visible, loaded, etc.
 *
 * @param edges - Relay edges
 * @returns Array of post IDs
 */
export function extractPostIds(edges: ReadonlyArray<RelayPostEdge>): string[] {
  return edges.map(edge => edge.node.id);
}

/**
 * Helper: Count total posts in Relay connection
 *
 * @param edges - Relay edges
 * @returns Number of posts
 */
export function countPosts(edges: ReadonlyArray<RelayPostEdge>): number {
  return edges.length;
}
