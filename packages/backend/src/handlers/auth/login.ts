import { LoginRequestSchema } from '@social-media-app/shared';
import { compose } from '../../infrastructure/middleware/compose.js';
import { withErrorHandling } from '../../infrastructure/middleware/withErrorHandling.js';
import { withLogging } from '../../infrastructure/middleware/withLogging.js';
import { withValidation } from '../../infrastructure/middleware/withValidation.js';
import { withServices } from '../../infrastructure/middleware/withServices.js';
import { successResponse } from '../../utils/responses.js';

/**
 * Lambda handler for user login
 * 
 * Authenticates a user with email and password, returning JWT tokens on success.
 * 
 * @route POST /auth/login
 * @middleware withErrorHandling - Converts errors to HTTP responses
 * @middleware withLogging - Structured logging with correlation IDs
 * @middleware withValidation - Validates request body against LoginRequestSchema
 * @middleware withServices - Injects authService into context
 */
export const handler = compose(
  withErrorHandling(),
  withLogging(),
  withValidation(LoginRequestSchema),
  withServices(['authService']),
  async (_event, context) => {
    // Business logic only - middleware handles validation, logging, and errors
    const response = await context.services.authService.login(context.validatedInput);
    return successResponse(200, response);
  }
);