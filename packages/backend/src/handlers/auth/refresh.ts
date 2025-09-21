import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { RefreshTokenRequestSchema, z } from '@social-media-app/shared';
import { createDefaultAuthService } from '@social-media-app/dal';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import { createJWTProvider, getJWTConfigFromEnv } from '../../utils/jwt.js';
import { successResponse, validationErrorResponse, unauthorizedResponse, internalServerErrorResponse } from '../../utils/responses.js';

/**
 * Lambda handler for token refresh
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Parse and validate request body
    const body = event.body ? JSON.parse(event.body) : {};
    const validatedRequest = RefreshTokenRequestSchema.parse(body);

    // Initialize dependencies
    const dynamoClient = createDynamoDBClient();
    const tableName = getTableName();
    const jwtConfig = getJWTConfigFromEnv();
    const jwtProvider = createJWTProvider(jwtConfig);

    // Create auth service
    const authService = createDefaultAuthService(dynamoClient, tableName, jwtProvider);

    // Attempt to refresh token
    const response = await authService.refreshToken(validatedRequest);

    return successResponse(200, response);

  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return validationErrorResponse(error.errors);
    }

    // Handle refresh token errors
    if (error instanceof Error) {
      if (
        error.message === 'Invalid refresh token' ||
        error.message === 'Refresh token expired' ||
        error.message === 'User not found'
      ) {
        return unauthorizedResponse(error.message);
      }

      // Log unexpected errors but don't expose details
      console.error('Token refresh error:', error.message, {
        requestId: event.requestContext?.requestId
      });
    }

    return internalServerErrorResponse();
  }
};