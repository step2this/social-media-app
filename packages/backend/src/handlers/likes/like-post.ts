import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { LikeService, PostService, ProfileService } from '@social-media-app/dal';
import {
  LikePostRequestSchema,
  LikePostResponseSchema,
  type LikePostResponse
} from '@social-media-app/shared';
import { errorResponse, successResponse, verifyAccessToken, getJWTConfigFromEnv } from '../../utils/index.js';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import { z } from 'zod';

/**
 * Handler to like a post
 * Validates request, authenticates user, fetches post metadata (owner ID and SK), and creates like
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
    const validatedRequest = LikePostRequestSchema.parse(body);

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

    // Fetch post to get metadata (owner ID and SK)
    const profileService = new ProfileService(dynamoClient, tableName);
    const postService = new PostService(dynamoClient, tableName, profileService);
    const post = await postService.getPostById(validatedRequest.postId);

    if (!post) {
      return errorResponse(404, 'Post not found');
    }

    /**
     * Extract post metadata for like creation:
     * - postUserId: User ID of the post owner (from post.userId)
     * - postSK: Reconstructed SK for the post (format: POST#<timestamp>#<postId>)
     *
     * These metadata fields are stored with the like entity to enable:
     * - Post owner notifications (knowing who owns the post that was liked)
     * - Efficient post entity lookup (using the post's SK)
     */
    const postUserId = post.userId;
    const postSK = `POST#${post.createdAt}#${post.id}`;

    // Like the post with metadata
    const likeService = new LikeService(dynamoClient, tableName);
    const result = await likeService.likePost(
      decoded.userId,
      validatedRequest.postId,
      postUserId,
      postSK
    );

    // Validate response
    const validatedResponse: LikePostResponse = LikePostResponseSchema.parse(result);

    return successResponse(200, validatedResponse);
  } catch (error) {
    console.error('Error liking post:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid request data');
    }

    return errorResponse(500, 'Internal server error');
  }
};
