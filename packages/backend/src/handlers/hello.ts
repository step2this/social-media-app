import { HelloRequestSchema } from '@social-media-app/shared';
import { helloService } from '@social-media-app/dal';
import { compose } from '../infrastructure/middleware/compose.js';
import { withErrorHandling } from '../infrastructure/middleware/withErrorHandling.js';
import { withLogging } from '../infrastructure/middleware/withLogging.js';
import { withValidation } from '../infrastructure/middleware/withValidation.js';
import { successResponse } from '../utils/responses.js';

/**
 * Lambda handler for hello endpoint
 *
 * Simple health check endpoint that validates input and returns a greeting.
 *
 * @route POST /hello
 * @middleware withErrorHandling - Converts errors to HTTP responses
 * @middleware withLogging - Structured logging with correlation IDs
 * @middleware withValidation - Validates request body against HelloRequestSchema
 */
export const handler = compose(
  withErrorHandling(),
  withLogging(),
  withValidation(HelloRequestSchema),
  async (_event, context) => {
    // Business logic only - generate greeting using DAL service
    const response = helloService.generateHelloResponse(context.validatedInput);
    return successResponse(200, response);
  }
);
