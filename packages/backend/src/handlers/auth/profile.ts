import { UpdateProfileWithHandleRequestSchema } from '@social-media-app/shared';
import { ProfileService } from '@social-media-app/dal';
import { compose } from '../../infrastructure/middleware/compose.js';
import { withErrorHandling, NotFoundError } from '../../infrastructure/middleware/withErrorHandling.js';
import { withLogging } from '../../infrastructure/middleware/withLogging.js';
import { withAuth } from '../../infrastructure/middleware/withAuth.js';
import { withValidation } from '../../infrastructure/middleware/withValidation.js';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import { successResponse } from '../../utils/responses.js';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

/**
 * Lambda handler for getting user profile (GET /auth/profile)
 * 
 * Retrieves the authenticated user's complete profile.
 * 
 * @middleware withErrorHandling - Converts errors to HTTP responses
 * @middleware withLogging - Structured logging with correlation IDs
 * @middleware withAuth - Validates access token and extracts userId (required)
 */
const getHandler = compose(
  withErrorHandling(),
  withLogging(),
  withAuth(), // Required - extracts userId from JWT
  async (_event, context) => {
    // Initialize profile service (not in middleware since it's used less frequently)
    const dynamoClient = createDynamoDBClient();
    const tableName = getTableName();
    const profileService = new ProfileService(dynamoClient, tableName);

    // Get full profile (User + Profile data)
    // Non-null assertion safe: withAuth middleware guarantees userId exists
    const profile = await profileService.getProfileById(context.userId!);

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    return successResponse(200, { profile });
  }
);

/**
 * Lambda handler for updating user profile (PUT /auth/profile)
 * 
 * Updates the authenticated user's profile information.
 * 
 * @middleware withErrorHandling - Converts errors to HTTP responses
 * @middleware withLogging - Structured logging with correlation IDs
 * @middleware withAuth - Validates access token and extracts userId (required)
 * @middleware withValidation - Validates request body against UpdateProfileWithHandleRequestSchema
 */
const updateHandler = compose(
  withErrorHandling(),
  withLogging(),
  withAuth(), // Required - extracts userId from JWT
  withValidation(UpdateProfileWithHandleRequestSchema),
  async (_event, context) => {
    // Initialize profile service
    const dynamoClient = createDynamoDBClient();
    const tableName = getTableName();
    const profileService = new ProfileService(dynamoClient, tableName);

    // Update the profile using validated input
    // Non-null assertion safe: withAuth middleware guarantees userId exists
    const updatedProfile = await profileService.updateProfile(
      context.userId!,
      context.validatedInput
    );

    return successResponse(200, { profile: updatedProfile });
  }
);

/**
 * Main handler that routes to appropriate function based on HTTP method
 * 
 * @route GET /auth/profile - Get user profile
 * @route PUT /auth/profile - Update user profile
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;

  switch (method) {
    case 'GET':
      return getHandler(event);
    case 'PUT':
      return updateHandler(event);
    default:
      return {
        statusCode: 405,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Method not allowed',
          message: `HTTP method ${method} is not supported for this endpoint`
        })
      };
  }
};
