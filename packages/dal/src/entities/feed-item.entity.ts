/**
 * Materialized feed item entity for DynamoDB single-table design
 *
 * Represents a post snapshot in a user's personalized feed cache.
 * Part of Phase 2 hybrid feed architecture.
 *
 * DynamoDB Structure:
 * - PK: USER#<userId>
 * - SK: FEED#<timestamp>#<postId>
 * - No GSI needed (feeds are user-scoped)
 *
 * Access Pattern:
 * - Get user's feed: Query PK=USER#<userId>, SK begins_with FEED#
 * - Sort: Descending by SK (latest first)
 * - Pagination: Standard DynamoDB cursor
 *
 * Lifecycle:
 * - Created: Stream processor on new post (if author < 5000 followers)
 * - TTL: 7 days (expiresAt field)
 * - Deleted: On post deletion or TTL expiry
 */
export interface FeedItemEntity {
  // DynamoDB keys
  PK: string;                      // USER#<userId>
  SK: string;                      // FEED#<timestamp>#<postId>

  // Post snapshot (immutable at creation)
  postId: string;
  authorId: string;
  authorHandle: string;            // Snapshot at creation time
  authorFullName?: string;         // Snapshot at creation time
  authorProfilePictureUrl?: string; // Snapshot at creation time
  caption?: string;                // Snapshot at creation time
  imageUrl?: string;               // Snapshot at creation time
  thumbnailUrl?: string;           // For grid fallback

  // Live metrics (updated by stream processors)
  likesCount: number;
  commentsCount: number;

  // User context (calculated at write time)
  isLiked: boolean;                // Was post liked when feed item created

  // Instagram-like read state (NEVER show same post twice)
  isRead?: boolean;                // Default: false/undefined (unread)
  readAt?: string;                 // ISO timestamp when marked as read

  // Metadata
  createdAt: string;               // Post creation time (ISO)
  feedItemCreatedAt: string;       // Feed item materialization time (ISO)
  expiresAt: number;               // Unix timestamp for TTL (7 days)
  entityType: 'FEED_ITEM';
  schemaVersion: number;           // For schema evolution
}

/**
 * Create DynamoDB keys for feed item
 *
 * @param userId - The user who owns this feed item
 * @param postCreatedAt - Post creation timestamp (ISO format)
 * @param postId - The post ID
 * @returns DynamoDB primary keys (PK, SK)
 *
 * @example
 * ```typescript
 * const keys = createFeedItemKeys(
 *   'user-123',
 *   '2025-10-12T10:00:00Z',
 *   'post-456'
 * );
 * // Returns: { PK: 'USER#user-123', SK: 'FEED#2025-10-12T10:00:00Z#post-456' }
 * ```
 */
export function createFeedItemKeys(
  userId: string,
  postCreatedAt: string,
  postId: string
): { PK: string; SK: string } {
  return {
    PK: `USER#${userId}`,
    SK: `FEED#${postCreatedAt}#${postId}`
  };
}

/**
 * Parse feed item keys to extract IDs
 *
 * @param entity - Feed item entity with PK and SK
 * @returns Parsed userId, timestamp, and postId
 *
 * @example
 * ```typescript
 * const parsed = parseFeedItemKeys({
 *   PK: 'USER#user-123',
 *   SK: 'FEED#2025-10-12T10:00:00Z#post-456'
 * });
 * // Returns: { userId: 'user-123', timestamp: '2025-10-12T10:00:00Z', postId: 'post-456' }
 * ```
 */
export function parseFeedItemKeys(entity: Pick<FeedItemEntity, 'PK' | 'SK'>): {
  userId: string;
  timestamp: string;
  postId: string;
} {
  const userId = entity.PK.replace('USER#', '');
  const [, timestamp, postId] = entity.SK.split('#');
  return { userId, timestamp, postId };
}
