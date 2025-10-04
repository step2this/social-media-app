import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { PostService, ProfileService } from '@social-media-app/dal';
import { PostResponseSchema } from '@social-media-app/shared';
import { errorResponse, successResponse } from '../../utils/index.js';
import {
  createDynamoDBClient,
  createS3Client,
  getTableName,
  getS3BucketName,
  getCloudFrontDomain
} from '../../utils/aws-config.js';
import { z } from 'zod';

/**
 * Handler to get a single post by ID
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Get postId from path parameters
    const postId = event.pathParameters?.postId;

    if (!postId) {
      return errorResponse(400, 'Post ID is required');
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

    // Get the post by ID
    const post = await postService.getPostById(postId);

    if (!post) {
      return errorResponse(404, 'Post not found');
    }

    // Validate response
    const validatedResponse = PostResponseSchema.parse({ post });

    return successResponse(200, validatedResponse);
  } catch (error) {
    console.error('Error getting post:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid response data', error.errors);
    }

    return errorResponse(500, 'Internal server error');
  }
};