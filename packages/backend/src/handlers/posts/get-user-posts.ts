import type { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { PostService, ProfileService } from '@social-media-app/dal';
import {
  PostGridResponseSchema,
  type PostGridResponse,
  type GetUserPostsRequest
} from '@social-media-app/shared';
import { createErrorResponse, createSuccessResponse } from '../../utils/responses.js';
import { z } from 'zod';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const tableName = process.env.TABLE_NAME || 'social-media-app';

const profileService = new ProfileService(
  docClient,
  tableName,
  process.env.MEDIA_BUCKET_NAME,
  process.env.CLOUDFRONT_DOMAIN
);

const postService = new PostService(docClient, tableName, profileService);

/**
 * Handler to get posts by user handle
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Get handle from path parameters
    const handle = event.pathParameters?.handle;

    if (!handle) {
      return createErrorResponse(400, 'Handle is required');
    }

    // Get query parameters for pagination
    const limit = event.queryStringParameters?.limit
      ? parseInt(event.queryStringParameters.limit, 10)
      : 24;

    const cursor = event.queryStringParameters?.cursor;

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return createErrorResponse(400, 'Invalid limit parameter');
    }

    const request: GetUserPostsRequest = {
      handle,
      limit,
      cursor
    };

    // Get user posts
    const postsData = await postService.getUserPostsByHandle(request);

    // Validate response
    const validatedResponse = PostGridResponseSchema.parse(postsData);

    return createSuccessResponse(validatedResponse);
  } catch (error) {
    console.error('Error getting user posts:', error);

    if (error instanceof z.ZodError) {
      return createErrorResponse(400, 'Invalid response data', error.errors);
    }

    return createErrorResponse(500, 'Internal server error');
  }
};