import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { z } from 'zod';
import { errorResponse } from './responses.js';

/**
 * Standardized error handler for notification API handlers
 * Provides consistent error responses across all endpoints
 *
 * @param error - The error to handle
 * @param context - Context string for logging (e.g., 'getting notifications')
 * @returns API Gateway error response
 *
 * @example
 * try {
 *   // Handler logic
 * } catch (error) {
 *   return handleNotificationError(error, 'getting notifications');
 * }
 */
export const handleNotificationError = (
  error: unknown,
  context: string
): APIGatewayProxyResultV2 => {
  console.error(`Error ${context}:`, error);

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    return errorResponse(400, 'Invalid request data', error.errors);
  }

  // Handle authorization errors from services (403 Forbidden)
  if (error instanceof Error && error.message.includes('Unauthorized')) {
    return errorResponse(403, 'Forbidden');
  }

  // Handle token verification errors (401 Unauthorized)
  if (error instanceof Error && (
    error.message.includes('token') ||
    error.message.includes('jwt')
  )) {
    return errorResponse(401, 'Unauthorized');
  }

  // Handle JSON parsing errors
  if (error instanceof Error && error.message.includes('Invalid JSON')) {
    return errorResponse(400, error.message);
  }

  // Default to 500 Internal Server Error
  return errorResponse(500, 'Internal server error');
};
