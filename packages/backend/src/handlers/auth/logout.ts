import { LogoutRequestSchema } from '@social-media-app/shared';
import { compose } from '../../infrastructure/middleware/compose.js';
import { withErrorHandling } from '../../infrastructure/middleware/withErrorHandling.js';
import { withLogging } from '../../infrastructure/middleware/withLogging.js';
import { withValidation } from '../../infrastructure/middleware/withValidation.js';
import { withServices } from '../../infrastructure/middleware/withServices.js';
import { withAuth } from '../../infrastructure/middleware/withAuth.js';
import { successResponse } from '../../utils/responses.js';

/**
 * Lambda handler for user logout
 *
 * Invalidates user's refresh token to log them out. Logout is idempotent - always succeeds.
 *
 * @route POST /auth/logout
 * @middleware withErrorHandling - Converts errors to HTTP responses
 * @middleware withLogging - Structured logging with correlation IDs
 * @middleware withAuth - Validates access token and extracts userId
 * @middleware withValidation - Validates request body against LogoutRequestSchema
 * @middleware withServices - Injects authService into context
 */
export const handler = compose(
  withErrorHandling(),
  withLogging(),
  withAuth(), // Required - extracts userId from JWT
  withValidation(LogoutRequestSchema),
  withServices(['authService']),
  async (_event, context) => {
    try {
      // Business logic - invalidate refresh token
      // Non-null assertions safe: middleware guarantees these exist
      await context.services!.authService.logout(
        context.validatedInput.refreshToken,
        context.userId! // withAuth middleware guarantees userId exists
      );

      return successResponse(200, {
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      // Log warning but always return success (idempotent operation)
      console.warn('[LOGOUT_ERROR]', {
        correlationId: context.correlationId,
        userId: context.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return successResponse(200, {
        success: true,
        message: 'Logged out successfully'
      });
    }
  }
);
