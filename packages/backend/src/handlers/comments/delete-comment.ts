import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { CommentService } from '@social-media-app/dal';
import {
  DeleteCommentRequestSchema,
  DeleteCommentResponseSchema,
  type DeleteCommentResponse
} from '@social-media-app/shared';
import { errorResponse, successResponse, verifyAccessToken, getJWTConfigFromEnv } from '../../utils/index.js';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import { z } from 'zod';

/**
 * Handler to delete a comment
 * Only the comment owner can delete their comment
 * Idempotent - returns success even if comment doesn't exist
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
    const validatedRequest = DeleteCommentRequestSchema.parse(body);

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
    const commentService = new CommentService(dynamoClient, tableName);

    // Delete the comment
    const result = await commentService.deleteComment(decoded.userId, validatedRequest.commentId);

    // Validate response
    const validatedResponse: DeleteCommentResponse = DeleteCommentResponseSchema.parse(result);

    return successResponse(200, validatedResponse);
  } catch (error) {
    console.error('Error deleting comment:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid request data');
    }

    // Handle authorization errors from CommentService
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return errorResponse(403, 'Forbidden');
    }

    // Handle token verification errors
    if (error instanceof Error && (
      error.message.includes('token') ||
      error.message.includes('jwt')
    )) {
      return errorResponse(401, 'Unauthorized');
    }

    return errorResponse(500, 'Internal server error');
  }
};
