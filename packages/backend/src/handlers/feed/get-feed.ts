import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { PostService, ProfileService } from '@social-media-app/dal';
import {
  PostGridResponseSchema,
  type FeedRequest
} from '@social-media-app/shared';
import { errorResponse, successResponse } from '../../utils/index.js';
import {
  createDynamoDBClient,
  createS3Client,
  getTableName,
  getS3BucketName,
  getCloudFrontDomain
} from '../../utils/dynamodb.js';
import { z } from 'zod';

/**
 * Handler to get feed/explore posts
 * Returns all public posts from all users
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Get query parameters for pagination
    const limit = event.queryStringParameters?.limit
      ? parseInt(event.queryStringParameters.limit, 10)
      : 24;

    const cursor = event.queryStringParameters?.cursor;

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return errorResponse(400, 'Invalid limit parameter (must be 1-100)');
    }

    const request: FeedRequest = {
      limit,
      cursor
    };

    // Initialize dependencies
    const dynamoClient = createDynamoDBClient();
    const s3Client = createS3Client();
    const tableName = getTableName();
    const s3BucketName = getS3BucketName();
    const cloudFrontDomain = getCloudFrontDomain();

    const profileService = new ProfileService(
      dynamoClient,
      tableName,
      s3BucketName,
      cloudFrontDomain,
      s3Client
    );

    const postService = new PostService(dynamoClient, tableName, profileService);

    // Get feed posts
    const feedData = await postService.getFeedPosts(request.limit, request.cursor);

    // Validate response
    const validatedResponse = PostGridResponseSchema.parse(feedData);

    return successResponse(200, validatedResponse);
  } catch (error) {
    console.error('Error getting feed:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid response data', error.errors);
    }

    return errorResponse(500, 'Internal server error');
  }
};
