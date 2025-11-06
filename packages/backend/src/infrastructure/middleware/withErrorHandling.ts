/**
 * Error Handling Middleware
 *
 * Wraps the entire middleware chain in try-catch and converts errors to appropriate HTTP responses.
 * Provides consistent error handling across all Lambda handlers.
 *
 * Error Types Handled:
 * - Zod Validation Errors → 400 Bad Request with field details
 * - Authentication Errors → 401 Unauthorized
 * - Authorization Errors → 403 Forbidden
 * - Not Found Errors → 404 Not Found
 * - Unknown Errors → 500 Internal Server Error (logs details, hides from client)
 *
 * @example
 * ```typescript
 * export const handler = compose(
 *   withErrorHandling(),
 *   withLogging(),
 *   async (event, context) => {
 *     // Business logic - errors are automatically caught and handled
 *     throw new Error('Something went wrong');
 *   }
 * );
 * ```
 */

import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { z } from '@social-media-app/shared';
import type { Middleware } from './compose.js';
import {
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  internalServerErrorResponse
} from '../../utils/responses.js';

/**
 * Custom error types for domain-specific errors
 */
export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Convert error to appropriate HTTP response
 */
function handleError(error: unknown, correlationId?: string): APIGatewayProxyResultV2 {
  // Log error details (but don't expose to client)
  console.error('[ERROR_HANDLER]', {
    correlationId,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error
  });

  // Zod validation errors - 400 Bad Request
  if (error instanceof z.ZodError) {
    return validationErrorResponse(error.errors);
  }

  // Authentication errors - 401 Unauthorized
  if (error instanceof UnauthorizedError) {
    return unauthorizedResponse(error.message);
  }

  // Authorization errors - 403 Forbidden
  if (error instanceof ForbiddenError) {
    return forbiddenResponse(error.message);
  }

  // Not found errors - 404 Not Found
  if (error instanceof NotFoundError) {
    return notFoundResponse(error.message);
  }

  // Known error types with specific messages
  if (error instanceof Error) {
    // Check for common auth-related error messages
    if (error.message === 'Invalid email or password') {
      return unauthorizedResponse(error.message);
    }

    if (error.message === 'Token expired' || error.message === 'Invalid token') {
      return unauthorizedResponse(error.message);
    }

    // Check for not found messages
    if (error.message.includes('not found')) {
      return notFoundResponse(error.message);
    }
  }

  // Unknown errors - 500 Internal Server Error (hide details from client)
  return internalServerErrorResponse();
}

/**
 * Error handling middleware factory
 *
 * Wraps the middleware chain in try-catch and converts errors to HTTP responses.
 * Should be the outermost middleware in the composition chain.
 *
 * @returns Middleware function that handles errors
 */
export const withErrorHandling = (): Middleware => {
  return async (event, context, next) => {
    const correlationId = event.requestContext?.requestId;

    try {
      return await next();
    } catch (error) {
      return handleError(error, correlationId);
    }
  };
};
