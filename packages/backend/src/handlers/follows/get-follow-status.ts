import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { FollowService } from '@social-media-app/dal';
import {
  GetFollowStatusRequestSchema,
  GetFollowStatusResponseSchema,
  type GetFollowStatusResponse
} from '@social-media-app/shared';
import { errorResponse, successResponse, verifyAccessToken, getJWTConfigFromEnv } from '../../utils/index.js';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import { z } from 'zod';

/**
 * Handler to get follow status for a user
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Extract userId from path parameters
    const userId = event.pathParameters?.userId;
    if (!userId) {
      return errorResponse(400, 'Missing userId in path parameters');
    }

    // Validate userId
    const validatedRequest = GetFollowStatusRequestSchema.parse({ userId });

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

    // Get follow status
    const result = await followService.getFollowStatus(decoded.userId, validatedRequest.userId);

    // Validate response
    const validatedResponse: GetFollowStatusResponse = GetFollowStatusResponseSchema.parse(result);

    return successResponse(200, validatedResponse);
  } catch (error) {
    console.error('Error getting follow status:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid request data');
    }

    return errorResponse(500, 'Internal server error');
  }
};
