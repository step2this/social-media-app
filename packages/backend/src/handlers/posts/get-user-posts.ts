import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { PostService, ProfileService } from '@social-media-app/dal';
import {
  PostGridResponseSchema,
  type GetUserPostsRequest
} from '@social-media-app/shared';
import { errorResponse, successResponse } from '../../utils/index.js';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import { z } from 'zod';

/**
 * Handler to get posts by user handle
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Get handle from path parameters
    const handle = event.pathParameters?.handle;

    if (!handle) {
      return errorResponse(400, 'Handle is required');
    }

    // Get query parameters for pagination
    const limit = event.queryStringParameters?.limit
      ? parseInt(event.queryStringParameters.limit, 10)
      : 24;

    const cursor = event.queryStringParameters?.cursor;

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return errorResponse(400, 'Invalid limit parameter');
    }

    const request: GetUserPostsRequest = {
      handle,
      limit,
      cursor
    };

    // Initialize dependencies
    const dynamoClient = createDynamoDBClient();
    const tableName = getTableName();

    const profileService = new ProfileService(
      dynamoClient,
      tableName,
      process.env.MEDIA_BUCKET_NAME,
      process.env.CLOUDFRONT_DOMAIN
    );

    const postService = new PostService(dynamoClient, tableName, profileService);

    // Get user posts
    const postsData = await postService.getUserPostsByHandle(request);

    // Validate response
    const validatedResponse = PostGridResponseSchema.parse(postsData);

    return successResponse(200, validatedResponse);
  } catch (error) {
    console.error('Error getting user posts:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid response data', error.errors);
    }

    return errorResponse(500, 'Internal server error');
  }
};