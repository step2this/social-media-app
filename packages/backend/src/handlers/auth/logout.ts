import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { LogoutRequestSchema, z } from '@social-media-app/shared';
import { createDefaultAuthService } from '@social-media-app/dal';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import { createJWTProvider, getJWTConfigFromEnv, extractTokenFromHeader, verifyAccessToken } from '../../utils/jwt.js';
import { successResponse, validationErrorResponse, unauthorizedResponse } from '../../utils/responses.js';

/**
 * Lambda handler for user logout
 */
export const handler = async (
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
    const validatedRequest = LogoutRequestSchema.parse(body);

    // Initialize dependencies
    const dynamoClient = createDynamoDBClient();
    const tableName = getTableName();
    const jwtProvider = createJWTProvider(jwtConfig);

    // Create auth service
    const authService = createDefaultAuthService(dynamoClient, tableName, jwtProvider);

    // Logout user by invalidating refresh token
    await authService.logout(validatedRequest.refreshToken, decodedToken.userId);

    return successResponse(200, {
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return validationErrorResponse(error.errors);
    }

    // Handle logout errors
    if (error instanceof Error) {
      // Log error but always return success for logout (idempotent operation)
      console.warn('Logout warning:', error.message, {
        userId: 'redacted',
        requestId: event.requestContext?.requestId
      });
    }

    // Always return success for logout to be idempotent
    return successResponse(200, {
      success: true,
      message: 'Logged out successfully'
    });
  }
};