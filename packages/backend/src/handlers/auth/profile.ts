import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { UpdateProfileRequestSchema, z } from '@social-media-app/shared';
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
    const decodedToken = verifyAccessToken(accessToken, jwtConfig.secret);

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
    const decodedToken = verifyAccessToken(accessToken, jwtConfig.secret);

    if (!decodedToken) {
      return unauthorizedResponse('Invalid access token');
    }

    // Parse and validate request body
    const body = event.body ? JSON.parse(event.body) : {};
    const validatedRequest = UpdateProfileRequestSchema.parse(body);

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

    // Note: For this implementation, we'll need to add an updateProfile method to the auth service
    // For now, return the current user (placeholder implementation)

    return successResponse(200, {
      user: {
        ...currentUser,
        ...validatedRequest,
        updatedAt: new Date().toISOString()
      }
    });

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