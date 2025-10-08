import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { LikeService } from '@social-media-app/dal';
import {
  GetPostLikeStatusRequestSchema,
  GetPostLikeStatusResponseSchema,
  type GetPostLikeStatusResponse
} from '@social-media-app/shared';
import { errorResponse, successResponse, verifyAccessToken, getJWTConfigFromEnv } from '../../utils/index.js';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import { z } from 'zod';

/**
 * Handler to get like status for a post
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Extract postId from path parameters
    const postId = event.pathParameters?.postId;
    if (!postId) {
      return errorResponse(400, 'Missing postId in path parameters');
    }

    // Validate postId
    const validatedRequest = GetPostLikeStatusRequestSchema.parse({ postId });

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
    const likeService = new LikeService(dynamoClient, tableName);

    // Get like status
    const result = await likeService.getPostLikeStatus(decoded.userId, validatedRequest.postId);

    // Validate response
    const validatedResponse: GetPostLikeStatusResponse = GetPostLikeStatusResponseSchema.parse(result);

    return successResponse(200, validatedResponse);
  } catch (error) {
    console.error('Error getting like status:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid request data');
    }

    return errorResponse(500, 'Internal server error');
  }
};
