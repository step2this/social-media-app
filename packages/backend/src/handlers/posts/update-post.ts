import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { PostService, ProfileService } from '@social-media-app/dal';
import {
  UpdatePostRequestSchema,
  PostResponseSchema,
  type PostResponse
} from '@social-media-app/shared';
import { errorResponse, successResponse, verifyAccessToken, getJWTConfigFromEnv } from '../../utils/index.js';
import {
  createDynamoDBClient,
  createS3Client,
  getTableName,
  getS3BucketName,
  getCloudFrontDomain
} from '../../utils/aws-config.js';
import { z } from 'zod';

/**
 * Handler to update an existing post
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Extract postId from path parameters
    const postId = event.pathParameters?.postId;
    if (!postId) {
      return errorResponse(400, 'Post ID is required');
    }

    // Parse request body early
    let body: unknown;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return errorResponse(400, 'Invalid JSON in request body');
    }

    // Validate request body
    const validatedRequest = UpdatePostRequestSchema.parse(body);

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

    // Update the post
    const updatedPost = await postService.updatePost(
      postId,
      decoded.userId,
      validatedRequest
    );

    if (!updatedPost) {
      return errorResponse(404, 'Post not found or you do not have permission to edit it');
    }

    // Validate response
    const response: PostResponse = {
      post: updatedPost
    };

    const validatedResponse = PostResponseSchema.parse(response);

    return successResponse(200, validatedResponse);
  } catch (error) {
    console.error('Error updating post:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid request data', error.errors);
    }

    return errorResponse(500, 'Internal server error');
  }
};