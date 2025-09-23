import type { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { PostService, ProfileService } from '@social-media-app/dal';
import {
  DeletePostResponseSchema,
  type DeletePostResponse
} from '@social-media-app/shared';
import { createErrorResponse, createSuccessResponse } from '../../utils/responses.js';
import { verifyToken } from '../../utils/jwt.js';
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
 * Handler to delete a post
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Verify authentication
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);

    if (!decoded || !decoded.userId) {
      return createErrorResponse(401, 'Invalid token');
    }

    // Get post ID from path parameters
    const postId = event.pathParameters?.postId;

    if (!postId) {
      return createErrorResponse(400, 'Post ID is required');
    }

    // Delete the post
    const deleted = await postService.deletePost(postId, decoded.userId);

    if (!deleted) {
      return createErrorResponse(404, 'Post not found or unauthorized');
    }

    // Validate response
    const response: DeletePostResponse = {
      success: true,
      message: 'Post deleted successfully'
    };

    const validatedResponse = DeletePostResponseSchema.parse(response);

    return createSuccessResponse(validatedResponse);
  } catch (error) {
    console.error('Error deleting post:', error);

    if (error instanceof z.ZodError) {
      return createErrorResponse(400, 'Invalid response data', error.errors);
    }

    return createErrorResponse(500, 'Internal server error');
  }
};