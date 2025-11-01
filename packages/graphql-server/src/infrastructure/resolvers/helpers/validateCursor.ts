/**
 * Cursor Validation Helper - Type-Safe Cursor Handling
 *
 * Pattern from SKILL.md - Pattern 6: Discriminated Unions (Result type)
 *
 * Provides type-safe cursor validation using Result type for composable
 * error handling without throwing exceptions immediately.
 *
 * Cursors are base64-encoded JSON strings used for pagination.
 * Invalid cursors should return a BAD_REQUEST error.
 *
 * @example
 * ```typescript
 * // Using Result type (functional style)
 * const result = validateCursor(args.cursor);
 * if (isFailure(result)) {
 *   throw new GraphQLError(result.error.message, {
 *     extensions: { code: result.error.code }
 *   });
 * }
 * const cursor = result.data;
 *
 * // Using throwing style (imperative)
 * const cursor = requireValidCursor(args.cursor);
 * ```
 */

import { GraphQLError } from 'graphql';
import { Result, success, failure } from '../types/Result.js';
import { ERROR_CODES } from '../types/ErrorCodes.js';

/**
 * Validates a base64-encoded cursor for pagination.
 *
 * Returns Result type for type-safe error handling without throwing.
 * This allows consumers to decide how to handle errors.
 *
 * @param cursor - Base64-encoded cursor string or null/undefined
 * @returns Result with cursor or undefined on success, error details on failure
 *
 * @example
 * ```typescript
 * const result = validateCursor(args.cursor);
 * if (isSuccess(result)) {
 *   const cursor = result.data; // string | undefined
 *   // Use cursor for query
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */
export function validateCursor(
  cursor: string | null | undefined
): Result<string | undefined, 'BAD_REQUEST'> {
  // Null/undefined cursors are valid (means first page)
  if (!cursor) {
    return success(undefined);
  }

  // Base64 regex: only valid base64 characters (A-Z, a-z, 0-9, +, /, =)
  // Must be properly padded (length multiple of 4)
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;

  // Check if string matches base64 pattern
  if (!base64Regex.test(cursor)) {
    return failure(ERROR_CODES.BAD_REQUEST, 'Invalid cursor format');
  }

  // Check if length is valid (must be multiple of 4 or have proper padding)
  if (cursor.length % 4 !== 0) {
    return failure(ERROR_CODES.BAD_REQUEST, 'Invalid cursor format');
  }

  try {
    // Attempt to decode to verify it's decodable
    Buffer.from(cursor, 'base64').toString('utf-8');
    return success(cursor);
  } catch {
    return failure(ERROR_CODES.BAD_REQUEST, 'Invalid cursor format');
  }
}

/**
 * Validates cursor and throws GraphQLError on failure.
 *
 * Convenience function for resolvers that want to throw immediately
 * instead of handling Result type.
 *
 * @param cursor - Base64-encoded cursor string or null/undefined
 * @returns Validated cursor or undefined
 * @throws {GraphQLError} with BAD_REQUEST code if cursor is invalid
 *
 * @example
 * ```typescript
 * // Throws immediately on error - simpler than validateCursor
 * const cursor = requireValidCursor(args.cursor);
 * const posts = await service.getPosts({ cursor });
 * ```
 */
export function requireValidCursor(
  cursor: string | null | undefined
): string | undefined {
  const result = validateCursor(cursor);

  if (!result.success) {
    throw new GraphQLError(result.error.message, {
      extensions: { code: result.error.code },
    });
  }

  return result.data;
}
