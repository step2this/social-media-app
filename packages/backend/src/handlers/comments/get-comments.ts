import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { CommentService } from '@social-media-app/dal';
import {
  GetCommentsRequestSchema,
  CommentsListResponseSchema,
  type CommentsListResponse
} from '@social-media-app/shared';
import { errorResponse, successResponse } from '../../utils/index.js';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import { z } from 'zod';

/**
 * Handler to get comments for a post
 * Public endpoint - no authentication required
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Extract query parameters
    const postId = event.queryStringParameters?.postId;

    // Parse limit as number if provided
    const limitParam = event.queryStringParameters?.limit;
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    const cursor = event.queryStringParameters?.cursor;

    // Validate request using schema
    const validationResult = GetCommentsRequestSchema.safeParse({
      postId,
      limit,
      cursor
    });

    if (!validationResult.success) {
      return errorResponse(
        400,
        'Invalid request parameters',
        validationResult.error.errors
      );
    }

    // Initialize dependencies
    const dynamoClient = createDynamoDBClient();
    const tableName = getTableName();

    const commentService = new CommentService(dynamoClient, tableName);

    // Get comments for the post
    const commentsData: CommentsListResponse = await commentService.getCommentsByPost(
      validationResult.data.postId,
      validationResult.data.limit,
      validationResult.data.cursor
    );

    // Validate response
    const validatedResponse = CommentsListResponseSchema.parse(commentsData);

    return successResponse(200, validatedResponse);
  } catch (error) {
    console.error('Error getting comments:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid response data', error.errors);
    }

    return errorResponse(500, 'Internal server error');
  }
};
