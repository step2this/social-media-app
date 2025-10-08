import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { FollowService } from '@social-media-app/dal';
import {
  UnfollowUserRequestSchema,
  UnfollowUserResponseSchema,
  type UnfollowUserResponse
} from '@social-media-app/shared';
import { errorResponse, successResponse, verifyAccessToken, getJWTConfigFromEnv } from '../../utils/index.js';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import { z } from 'zod';

/**
 * Handler to unfollow a user
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Parse request body early
    let body: unknown;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return errorResponse(400, 'Invalid JSON in request body');
    }

    // Validate request body
    const validatedRequest = UnfollowUserRequestSchema.parse(body);

    // Verify authentication
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse(401, 'Unauthorized');
    }

    const token = authHeader.substring(7);
    const jwtConfig = getJWTConfigFromEnv();
    const decoded = await verifyAccessToken(token, jwtConfig.secret);

    if (!decoded || !decoded.userId) {
      return errorResponse(401, 'Invalid token');
    }

    // Initialize services
    const dynamoClient = createDynamoDBClient();
    const tableName = getTableName();
    const followService = new FollowService(dynamoClient, tableName);

    // Unfollow the user
    const result = await followService.unfollowUser(decoded.userId, validatedRequest.userId);

    // Validate response
    const validatedResponse: UnfollowUserResponse = UnfollowUserResponseSchema.parse(result);

    return successResponse(200, validatedResponse);
  } catch (error) {
    console.error('Error unfollowing user:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid request data');
    }

    return errorResponse(500, 'Internal server error');
  }
};
