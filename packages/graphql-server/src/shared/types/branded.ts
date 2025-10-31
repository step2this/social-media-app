/**
 * Branded Types
 *
 * Type-safe branded types for domain entities.
 * These provide compile-time type safety while maintaining runtime compatibility with strings.
 *
 * Branded types prevent mixing different ID types:
 * - UserId cannot be assigned to PostId
 * - PostId cannot be assigned to CommentId
 * - etc.
 *
 * Example:
 * ```typescript
 * const userId = UserId('user-123');
 * const postId = PostId('post-456');
 *
 * function getUser(id: UserId) { ... }
 *
 * getUser(userId); // ✅ OK
 * getUser(postId); // ❌ Type error
 * getUser('user-123'); // ❌ Type error (must use UserId constructor)
 * ```
 *
 * @see https://egghead.io/blog/using-branded-types-in-typescript
 */

/**
 * Brand<K, T> - Generic branded type
 *
 * Creates a branded type that is type-safe at compile time but remains
 * a regular value at runtime.
 *
 * @template K - The base type (e.g., string, number)
 * @template T - The brand label (e.g., 'UserId', 'PostId')
 */
export type Brand<K, T> = K & { __brand: T };

/**
 * UserId - Branded type for user identifiers
 *
 * Ensures user IDs cannot be confused with other ID types.
 */
export type UserId = Brand<string, 'UserId'>;

/**
 * UserId constructor
 *
 * Creates a UserId from a string.
 *
 * @param id - The user ID string
 * @returns A branded UserId
 *
 * @example
 * const userId = UserId('user-123');
 */
export const UserId = (id: string): UserId => id as UserId;

/**
 * PostId - Branded type for post identifiers
 *
 * Ensures post IDs cannot be confused with other ID types.
 */
export type PostId = Brand<string, 'PostId'>;

/**
 * PostId constructor
 *
 * Creates a PostId from a string.
 *
 * @param id - The post ID string
 * @returns A branded PostId
 *
 * @example
 * const postId = PostId('post-456');
 */
export const PostId = (id: string): PostId => id as PostId;

/**
 * CommentId - Branded type for comment identifiers
 *
 * Ensures comment IDs cannot be confused with other ID types.
 */
export type CommentId = Brand<string, 'CommentId'>;

/**
 * CommentId constructor
 *
 * Creates a CommentId from a string.
 *
 * @param id - The comment ID string
 * @returns A branded CommentId
 *
 * @example
 * const commentId = CommentId('comment-789');
 */
export const CommentId = (id: string): CommentId => id as CommentId;

/**
 * Cursor - Branded type for pagination cursors
 *
 * Ensures cursors cannot be confused with regular strings.
 * Cursors are typically base64-encoded JSON strings.
 */
export type Cursor = Brand<string, 'Cursor'>;

/**
 * Cursor constructor
 *
 * Creates a Cursor from a base64-encoded string.
 *
 * @param cursor - The base64-encoded cursor string
 * @returns A branded Cursor
 *
 * @example
 * const cursor = Cursor('eyJpZCI6InBvc3QtMTIzIn0=');
 */
export const Cursor = (cursor: string): Cursor => cursor as Cursor;

/**
 * Handle - Branded type for user handles (e.g., @johndoe)
 *
 * Ensures handles cannot be confused with regular strings.
 */
export type Handle = Brand<string, 'Handle'>;

/**
 * Handle constructor
 *
 * Creates a Handle from a string (typically with @ prefix).
 *
 * @param handle - The handle string
 * @returns A branded Handle
 *
 * @example
 * const handle = Handle('@johndoe');
 */
export const Handle = (handle: string): Handle => handle as Handle;
