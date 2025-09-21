import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { RegisterRequestSchema, z } from '@social-media-app/shared';
import { createDefaultAuthService } from '@social-media-app/dal';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import { createJWTProvider, getJWTConfigFromEnv } from '../../utils/jwt.js';
import { successResponse, validationErrorResponse, conflictResponse, internalServerErrorResponse } from '../../utils/responses.js';

/**
 * Lambda handler for user registration
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Parse and validate request body
    const body = event.body ? JSON.parse(event.body) : {};
    const validatedRequest = RegisterRequestSchema.parse(body);

    // Initialize dependencies
    const dynamoClient = createDynamoDBClient();
    const tableName = getTableName();
    const jwtConfig = getJWTConfigFromEnv();
    const jwtProvider = createJWTProvider(jwtConfig);

    // Create auth service
    const authService = createDefaultAuthService(dynamoClient, tableName, jwtProvider);

    // Attempt to register user
    const response = await authService.register(validatedRequest);

    return successResponse(201, response);

  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return validationErrorResponse(error.errors);
    }

    // Handle business logic errors
    if (error instanceof Error) {
      if (error.message === 'Email already registered' || error.message === 'Username already taken') {
        return conflictResponse(error.message);
      }

      // Log unexpected errors but don't expose details
      console.error('Registration error:', error.message, {
        userId: 'unknown',
        requestId: event.requestContext?.requestId
      });
    }

    return internalServerErrorResponse();
  }
};