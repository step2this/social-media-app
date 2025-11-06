import { RefreshTokenRequestSchema } from '@social-media-app/shared';
import { compose } from '../../infrastructure/middleware/compose.js';
import { withErrorHandling } from '../../infrastructure/middleware/withErrorHandling.js';
import { withLogging } from '../../infrastructure/middleware/withLogging.js';
import { withValidation } from '../../infrastructure/middleware/withValidation.js';
import { withServices } from '../../infrastructure/middleware/withServices.js';
import { successResponse } from '../../utils/responses.js';

/**
 * Lambda handler for token refresh
 * 
 * Validates and refreshes a user's JWT tokens using their refresh token.
 * 
 * @route POST /auth/refresh
 * @middleware withErrorHandling - Converts errors to HTTP responses (including auth errors)
 * @middleware withLogging - Structured logging with correlation IDs
 * @middleware withValidation - Validates request body against RefreshTokenRequestSchema
 * @middleware withServices - Injects authService into context
 */
export const handler = compose(
  withErrorHandling(),
  withLogging(),
  withValidation(RefreshTokenRequestSchema),
  withServices(['authService']),
  async (_event, context) => {
    // Business logic only - middleware handles validation, logging, and errors
    // Non-null assertion safe: withServices middleware guarantees authService exists
    const response = await context.services!.authService.refreshToken(context.validatedInput);
    return successResponse(200, response);
  }
);
