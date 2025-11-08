import { RegisterRequestSchema } from '@social-media-app/shared';
import { compose } from '../../infrastructure/middleware/compose.js';
import { withErrorHandling } from '../../infrastructure/middleware/withErrorHandling.js';
import { withLogging } from '../../infrastructure/middleware/withLogging.js';
import { withValidation } from '../../infrastructure/middleware/withValidation.js';
import { withServices } from '../../infrastructure/middleware/withServices.js';
import { successResponse } from '../../utils/responses.js';

/**
 * Lambda handler for user registration
 *
 * Creates a new user account with email, username, and password.
 *
 * @route POST /auth/register
 * @middleware withErrorHandling - Converts errors to HTTP responses (including conflict errors)
 * @middleware withLogging - Structured logging with correlation IDs
 * @middleware withValidation - Validates request body against RegisterRequestSchema
 * @middleware withServices - Injects authService into context
 */
export const handler = compose(
  withErrorHandling(),
  withLogging(),
  withValidation(RegisterRequestSchema),
  withServices(['authService']),
  async (_event, context) => {
    // Business logic only - middleware handles validation, logging, and errors
    // Non-null assertion safe: withServices middleware guarantees authService exists
    const response = await context.services!.authService.register(context.validatedInput);
    return successResponse(201, response);
  }
);
