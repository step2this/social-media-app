import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { PostService, ProfileService, FollowService } from '@social-media-app/dal';
import {
  FeedResponseSchema,
  type FeedRequest
} from '@social-media-app/shared';
import { errorResponse, successResponse, verifyAccessToken, getJWTConfigFromEnv } from '../../utils/index.js';
import {
  createDynamoDBClient,
  createS3Client,
  getTableName,
  getS3BucketName,
  getCloudFrontDomain
} from '../../utils/dynamodb.js';
import { z } from 'zod';

// Initialize services at container scope for Lambda warm starts
const dynamoClient = createDynamoDBClient();
const s3Client = createS3Client();
const tableName = getTableName();
const s3BucketName = getS3BucketName();
const cloudFrontDomain = getCloudFrontDomain();

// Note: Redis cache initialization omitted here as this handler uses direct PostService
// For cached feeds, use the get-feed.ts handler which implements materialized + cache strategy

const profileService = new ProfileService(
  dynamoClient,
  tableName,
  s3BucketName,
  cloudFrontDomain,
  s3Client
);

const postService = new PostService(dynamoClient, tableName, profileService);
const followService = new FollowService(dynamoClient, tableName);

/**
 * Handler to get following feed posts (home page)
 * Returns posts from users that the authenticated user follows
 * Requires authentication via JWT token
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Extract and verify JWT token
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(401, 'Missing or invalid authorization header');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const jwtConfig = getJWTConfigFromEnv();
    const decoded = await verifyAccessToken(token, jwtConfig.secret);
    const userId = decoded?.userId;

    if (!userId) {
      return errorResponse(401, 'Invalid token: missing userId');
    }

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

    // Get following feed posts
    const feedData = await postService.getFollowingFeedPosts(
      userId,
      followService,
      request.limit,
      request.cursor
    );

    // Validate response
    const validatedResponse = FeedResponseSchema.parse(feedData);

    return successResponse(200, validatedResponse);
  } catch (error) {
    console.error('Error getting following feed:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid response data', error.errors);
    }

    // JWT verification errors
    if (error instanceof Error && error.message.includes('JWT')) {
      return errorResponse(401, 'Invalid or expired token');
    }

    return errorResponse(500, 'Internal server error');
  }
};
