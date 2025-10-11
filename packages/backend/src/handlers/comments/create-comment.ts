import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { CommentService, ProfileService } from '@social-media-app/dal';
import {
  CreateCommentRequestSchema,
  CreateCommentResponseSchema,
  type CreateCommentResponse
} from '@social-media-app/shared';
import { errorResponse, successResponse, verifyAccessToken, getJWTConfigFromEnv } from '../../utils/index.js';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import { z } from 'zod';

/**
 * Handler to create a comment on a post
 * Validates request, authenticates user, fetches user handle from profile, and creates comment
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
    const validatedRequest = CreateCommentRequestSchema.parse(body);

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

    // Fetch user profile to get handle
    const profileService = new ProfileService(dynamoClient, tableName);
    const profile = await profileService.getProfileById(decoded.userId);

    if (!profile) {
      return errorResponse(500, 'User profile not found');
    }

    // Create comment
    const commentService = new CommentService(dynamoClient, tableName);
    const result = await commentService.createComment(
      decoded.userId,
      validatedRequest.postId,
      profile.handle,
      validatedRequest.content
    );

    // Validate response
    const validatedResponse: CreateCommentResponse = CreateCommentResponseSchema.parse(result);

    return successResponse(200, validatedResponse);
  } catch (error) {
    console.error('Error creating comment:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid request data');
    }

    // Handle validation errors from CommentService
    if (error instanceof Error && error.message.includes('Invalid comment content')) {
      return errorResponse(400, 'Invalid request data');
    }

    return errorResponse(500, 'Internal server error');
  }
};
