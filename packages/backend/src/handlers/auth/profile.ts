import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { UpdateProfileWithHandleRequestSchema, z } from '@social-media-app/shared';
import { ProfileService } from '@social-media-app/dal';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import { getJWTConfigFromEnv, extractTokenFromHeader, verifyAccessToken } from '../../utils/jwt.js';
import { successResponse, validationErrorResponse, unauthorizedResponse, notFoundResponse, internalServerErrorResponse } from '../../utils/responses.js';

/**
 * Lambda handler for getting user profile
 */
export const getHandler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Extract and verify access token from Authorization header
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    const accessToken = extractTokenFromHeader(authHeader);

    if (!accessToken) {
      return unauthorizedResponse('Access token required');
    }

    const jwtConfig = getJWTConfigFromEnv();
    const decodedToken = await verifyAccessToken(accessToken, jwtConfig.secret);

    if (!decodedToken) {
      return unauthorizedResponse('Invalid access token');
    }

    // Initialize dependencies
    const dynamoClient = createDynamoDBClient();
    const tableName = getTableName();

    // Create profile service to get complete profile data
    const profileService = new ProfileService(dynamoClient, tableName);

    // Get full profile (User + Profile data)
    const profile = await profileService.getProfileById(decodedToken.userId);

    if (!profile) {
      return notFoundResponse('Profile not found');
    }

    return successResponse(200, { profile });

  } catch (error) {
    console.error('Get profile error:', error instanceof Error ? error.message : String(error), {
      requestId: event.requestContext?.requestId
    });

    return internalServerErrorResponse();
  }
};

/**
 * Lambda handler for updating user profile
 */
export const updateHandler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Extract and verify access token from Authorization header
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    const accessToken = extractTokenFromHeader(authHeader);

    if (!accessToken) {
      return unauthorizedResponse('Access token required');
    }

    const jwtConfig = getJWTConfigFromEnv();
    const decodedToken = await verifyAccessToken(accessToken, jwtConfig.secret);

    if (!decodedToken) {
      return unauthorizedResponse('Invalid access token');
    }

    // Parse and validate request body
    const body = event.body ? JSON.parse(event.body) : {};
    const validatedRequest = UpdateProfileWithHandleRequestSchema.parse(body);

    // Initialize dependencies
    const dynamoClient = createDynamoDBClient();
    const tableName = getTableName();

    // Create profile service to handle profile updates
    const profileService = new ProfileService(dynamoClient, tableName);

    // Update the profile using the profile service
    const updatedProfile = await profileService.updateProfile(decodedToken.userId, validatedRequest);

    return successResponse(200, { profile: updatedProfile });

  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return validationErrorResponse(error.errors);
    }

    console.error('Update profile error:', error instanceof Error ? error.message : String(error), {
      requestId: event.requestContext?.requestId
    });

    return internalServerErrorResponse();
  }
};

/**
 * Main handler that routes to appropriate function based on HTTP method
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