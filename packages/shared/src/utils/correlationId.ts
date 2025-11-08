/**
 * Correlation ID Utilities
 *
 * Shared utility functions for managing correlation IDs across the application.
 * These utilities enable distributed tracing by generating, propagating, and extracting
 * correlation IDs from HTTP headers.
 *
 * Used by:
 * - Backend Lambda handlers (via withLogging middleware)
 * - GraphQL server (via lambda handler)
 * - Frontend (via Relay network layer and HTTP client)
 *
 * @module correlationId
 */

/**
 * Standard header name for correlation ID
 * Used consistently across frontend, GraphQL server, and backend lambdas
 */
export const CORRELATION_ID_HEADER = 'X-Correlation-Id' as const;

/**
 * Lowercase version for case-insensitive header comparison
 * HTTP headers are case-insensitive per RFC 2616
 */
export const CORRELATION_ID_HEADER_LOWER = 'x-correlation-id' as const;

/**
 * Gets or creates a correlation ID from various sources.
 *
 * Priority order:
 * 1. Existing correlation ID from headers (passed by client or upstream service)
 * 2. Request ID from API Gateway request context (for backend lambdas)
 * 3. Newly generated UUID (fallback)
 *
 * @param headers - HTTP headers object (case-insensitive lookup supported)
 * @param requestId - Optional request ID from API Gateway request context
 * @returns Correlation ID string
 *
 * @example
 * ```typescript
 * // Extract from Lambda event
 * const correlationId = getOrCreateCorrelationId(
 *   event.headers,
 *   event.requestContext?.requestId
 * );
 *
 * // Extract from Express-like headers
 * const correlationId = getOrCreateCorrelationId(req.headers);
 *
 * // Generate new ID
 * const correlationId = getOrCreateCorrelationId({});
 * ```
 */
export function getOrCreateCorrelationId(
  headers: Record<string, string | string[] | undefined> = {},
  requestId?: string
): string {
  // Try to extract from headers (case-insensitive)
  const headerValue =
    headers[CORRELATION_ID_HEADER] ||
    headers[CORRELATION_ID_HEADER_LOWER] ||
    headers['x-correlation-id']; // Handle other case variations

  if (headerValue) {
    // Handle both single string and array values
    return Array.isArray(headerValue) ? headerValue[0] : headerValue;
  }

  // Fallback to API Gateway request ID if available
  if (requestId) {
    return requestId;
  }

  // Generate new UUID as last resort
  return crypto.randomUUID();
}

/**
 * Adds correlation ID to headers object.
 * Useful for propagating correlation IDs to downstream services.
 *
 * This function:
 * - Creates a new headers object to avoid mutations
 * - Adds the correlation ID with the standard header name
 * - Preserves existing headers
 *
 * @param headers - Existing headers object
 * @param correlationId - Correlation ID to add
 * @returns New headers object with correlation ID included
 *
 * @example
 * ```typescript
 * // Add to response headers
 * const responseHeaders = addCorrelationIdToHeaders(
 *   existingHeaders,
 *   correlationId
 * );
 *
 * // Add to outgoing request headers
 * const requestHeaders = addCorrelationIdToHeaders(
 *   { 'Content-Type': 'application/json' },
 *   correlationId
 * );
 * ```
 */
export function addCorrelationIdToHeaders<T extends Record<string, any>>(
  headers: T,
  correlationId: string
): T & { [CORRELATION_ID_HEADER]: string } {
  return {
    ...headers,
    [CORRELATION_ID_HEADER]: correlationId
  };
}
