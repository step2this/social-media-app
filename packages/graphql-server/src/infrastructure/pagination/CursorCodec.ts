/**
 * CursorCodec
 *
 * Handles encoding and decoding of pagination cursors.
 * Cursors are opaque base64-encoded JSON strings containing { id, sortKey }.
 *
 * This keeps cursor implementation details hidden from GraphQL clients,
 * allowing us to change the cursor format without breaking client code.
 *
 * @example
 * ```typescript
 * const codec = new CursorCodec();
 *
 * // Encode
 * const cursorData: CursorData<string> = {
 *   id: 'post-123',
 *   sortKey: '2024-01-01T00:00:00Z'
 * };
 * const cursor = codec.encode(cursorData);
 * // cursor => 'eyJpZCI6InBvc3QtMTIzIiwic29ydEtleSI6IjIwMjQtMDEtMDFUMDA6MDA6MDBaIn0='
 *
 * // Decode
 * const result = codec.decode<string>(cursor);
 * if (result.success) {
 *   console.log(result.data.id); // 'post-123'
 *   console.log(result.data.sortKey); // '2024-01-01T00:00:00Z'
 * }
 * ```
 */

import { Cursor, CursorData, Result } from '../../shared/types/index.js';

/**
 * ICursorCodec - Interface for cursor encoding/decoding
 *
 * Defines the contract for cursor codec implementations.
 * Allows swapping implementations (e.g., Base64CursorCodec, EncryptedCursorCodec).
 */
export interface ICursorCodec {
  /**
   * Encode cursor data to an opaque cursor string.
   *
   * @param data - The cursor data to encode
   * @returns An opaque cursor string (base64-encoded JSON)
   */
  encode<T>(data: CursorData<T>): Cursor;

  /**
   * Decode an opaque cursor string back to cursor data.
   *
   * @param cursor - The opaque cursor to decode
   * @returns Result with cursor data if successful, or error if invalid
   */
  decode<T>(cursor: Cursor): Result<CursorData<T>>;
}

/**
 * CursorCodec - Base64-encoded JSON cursor implementation
 *
 * Encodes cursors as base64(JSON.stringify({ id, sortKey })).
 * This is the standard implementation for Relay-style pagination.
 *
 * Features:
 * - Opaque cursors (clients can't inspect internals)
 * - Type-safe encoding/decoding
 * - Graceful error handling (returns Result instead of throwing)
 * - Stateless (no side effects)
 * - Zero dependencies (uses native Buffer)
 *
 * @implements {ICursorCodec}
 */
export class CursorCodec implements ICursorCodec {
  /**
   * Encode cursor data to base64-encoded JSON string.
   *
   * The cursor format is: base64(JSON.stringify({ id, sortKey }))
   * This keeps the cursor opaque to clients while preserving all information
   * needed to fetch the next/previous page.
   *
   * @param data - The cursor data containing id and sortKey
   * @returns An opaque cursor string (branded Cursor type)
   *
   * @example
   * ```typescript
   * const codec = new CursorCodec();
   * const cursor = codec.encode({ id: 'post-123', sortKey: '2024-01-01' });
   * // Returns: 'eyJpZCI6InBvc3QtMTIzIiwic29ydEtleSI6IjIwMjQtMDEtMDEifQ=='
   * ```
   */
  encode<T>(data: CursorData<T>): Cursor {
    // Convert cursor data to JSON string
    const json = JSON.stringify(data);

    // Encode JSON to base64
    const base64 = Buffer.from(json, 'utf-8').toString('base64');

    // Return as branded Cursor type
    return Cursor(base64);
  }

  /**
   * Decode base64-encoded cursor back to cursor data.
   *
   * Reverses the encoding process: base64 → JSON → CursorData
   * Returns Result type for type-safe error handling.
   *
   * @param cursor - The opaque cursor to decode
   * @returns Result with cursor data if successful, or error if invalid
   *
   * @example
   * ```typescript
   * const codec = new CursorCodec();
   * const result = codec.decode<string>(cursor);
   *
   * if (result.success) {
   *   const { id, sortKey } = result.data;
   *   // Use id and sortKey to fetch next page from database
   * } else {
   *   console.error(result.error.message);
   * }
   * ```
   */
  decode<T>(cursor: Cursor): Result<CursorData<T>> {
    try {
      // Handle empty cursor
      if (!cursor || cursor.length === 0) {
        return {
          success: false,
          error: new Error('Invalid cursor: cursor is empty'),
        };
      }

      // Decode base64 to UTF-8 string
      const json = Buffer.from(cursor, 'base64').toString('utf-8');

      // Parse JSON to cursor data
      const data = JSON.parse(json) as CursorData<T>;

      // Validate cursor data structure
      if (typeof data !== 'object' || data === null) {
        return {
          success: false,
          error: new Error('Invalid cursor: decoded data is not an object'),
        };
      }

      if (!('id' in data) || !('sortKey' in data)) {
        return {
          success: false,
          error: new Error('Invalid cursor: missing id or sortKey field'),
        };
      }

      // Return successful result
      return {
        success: true,
        data,
      };
    } catch (error) {
      // Handle decoding errors (invalid base64, malformed JSON, etc.)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        error: new Error(`Invalid cursor: ${errorMessage}`),
      };
    }
  }
}
