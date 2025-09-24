import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { UpdateUserProfileRequestSchema, z } from '@social-media-app/shared';
import { createDefaultAuthService } from '@social-media-app/dal';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import { createJWTProvider, getJWTConfigFromEnv, extractTokenFromHeader, verifyAccessToken } from '../../utils/jwt.js';
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
    const jwtProvider = createJWTProvider(jwtConfig);

    // Create auth service
    const authService = createDefaultAuthService(dynamoClient, tableName, jwtProvider);

    // Get user profile
    const user = await authService.getUserById(decodedToken.userId);

    if (!user) {
      return notFoundResponse('User not found');
    }

    return successResponse(200, { user });

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
    const validatedRequest = UpdateUserProfileRequestSchema.parse(body);

    // Initialize dependencies
    const dynamoClient = createDynamoDBClient();
    const tableName = getTableName();
    const jwtProvider = createJWTProvider(jwtConfig);

    // Create auth service
    const authService = createDefaultAuthService(dynamoClient, tableName, jwtProvider);

    // Get current user to update
    const currentUser = await authService.getUserById(decodedToken.userId);

    if (!currentUser) {
      return notFoundResponse('User not found');
    }

    // Update the user profile using the auth service
    const updatedUser = await authService.updateUserProfile(decodedToken.userId, validatedRequest);

    return successResponse(200, { user: updatedUser });

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