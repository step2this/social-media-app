/**
 * GraphQL Response Builders
 *
 * Helper functions for constructing GraphQL responses in tests.
 * Useful for mocking Apollo Server responses.
 *
 * @example
 * ```typescript
 * import { createSuccessResponse, createErrorResponse } from '@social-media-app/shared/test-utils';
 *
 * const successResponse = createSuccessResponse({ exploreFeed: mockFeed });
 * const errorResponse = createErrorResponse('Not authenticated', 'UNAUTHENTICATED');
 * ```
 */

import type {
  GraphQLResult,
  SingleResult,
  GraphQLErrorResponse,
} from './response-types.js';

/**
 * Create a successful GraphQL response with data
 *
 * @param data - Data to include in response
 * @returns GraphQL result with data
 */
export function createSuccessResponse<T>(data: T): GraphQLResult<T> {
  return {
    kind: 'single',
    singleResult: {
      data,
    },
  };
}

/**
 * Create a GraphQL error response
 *
 * @param message - Error message
 * @param code - Error code (e.g., 'UNAUTHENTICATED', 'NOT_FOUND')
 * @param path - Optional path to the field that errored
 * @returns GraphQL result with error
 */
export function createErrorResponse<T = never>(
  message: string,
  code: string,
  path?: (string | number)[]
): GraphQLResult<T> {
  const error: GraphQLErrorResponse = {
    message,
    extensions: { code },
  };

  if (path) {
    error.path = path;
  }

  return {
    kind: 'single',
    singleResult: {
      errors: [error],
    },
  };
}

/**
 * Create a GraphQL response with multiple errors
 *
 * @param errors - Array of errors
 * @returns GraphQL result with errors
 */
export function createMultiErrorResponse<T = never>(
  errors: Array<{ message: string; code: string; path?: (string | number)[] }>
): GraphQLResult<T> {
  return {
    kind: 'single',
    singleResult: {
      errors: errors.map(({ message, code, path }) => ({
        message,
        extensions: { code },
        ...(path && { path }),
      })),
    },
  };
}

/**
 * Create a partial response with both data and errors
 * (GraphQL can return partial data alongside errors)
 *
 * @param data - Partial data to include
 * @param errors - Errors to include
 * @returns GraphQL result with both data and errors
 */
export function createPartialResponse<T>(
  data: T,
  errors: Array<{ message: string; code: string; path?: (string | number)[] }>
): GraphQLResult<T> {
  return {
    kind: 'single',
    singleResult: {
      data,
      errors: errors.map(({ message, code, path }) => ({
        message,
        extensions: { code },
        ...(path && { path }),
      })),
    },
  };
}

/**
 * Create a single result (for internal use or mocking)
 *
 * @param data - Optional data
 * @param errors - Optional errors
 * @returns SingleResult object
 */
export function createSingleResult<T>(
  data?: T,
  errors?: GraphQLErrorResponse[]
): SingleResult<T> {
  return {
    ...(data !== undefined && { data }),
    ...(errors && errors.length > 0 && { errors }),
  };
}