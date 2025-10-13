/**
 * POST /feed/read - Mark Feed Items as Read Handler
 *
 * Implements Instagram-like read state management where posts marked
 * as read NEVER appear in the feed again, even if caches are lost.
 *
 * This handler:
 * 1. Validates authentication
 * 2. Parses and validates postIds from request body
 * 3. Calls FeedService.markFeedItemsAsRead to update DynamoDB
 * 4. Returns count of successfully marked items
 *
 * Read state is persisted in DynamoDB as the source of truth:
 * - isRead: boolean field (default false)
 * - readAt: ISO timestamp when marked as read
 *
 * Once marked as read, getMaterializedFeedItems filters these posts
 * using FilterExpression, ensuring they never reappear.
 *
 * @see FeedService.markFeedItemsAsRead for implementation details
 * @see FeedItemEntity.isRead for schema definition
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { FeedService } from '@social-media-app/dal';
import { MarkFeedItemsAsReadRequestSchema } from '@social-media-app/shared';
import { errorResponse, successResponse, authenticateRequest } from '../../utils/index.js';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';

// Constants
const MAX_POST_IDS = 50; // Maximum posts to mark as read per request

// Initialize services at container scope for Lambda warm starts
const dynamoClient = createDynamoDBClient();
const tableName = getTableName();
const feedService = new FeedService(dynamoClient, tableName);

/**
 * Handler for POST /feed/read
 *
 * Marks specified posts as read for the authenticated user.
 *
 * @param event - API Gateway event
 * @returns API Gateway response
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // 1. Verify authentication
    const authResult = await authenticateRequest(event);

    if (!authResult.success) {
      return errorResponse(authResult.statusCode, authResult.message);
    }

    const userId = authResult.userId;

    // 2. Parse request body
    if (!event.body) {
      return errorResponse(400, 'Request body is required');
    }

    let requestBody: unknown;
    try {
      requestBody = JSON.parse(event.body);
    } catch (error) {
      return errorResponse(400, 'Invalid JSON in request body');
    }

    // 3. Validate request with Zod schema
    const parseResult = MarkFeedItemsAsReadRequestSchema.safeParse(requestBody);

    if (!parseResult.success) {
      return errorResponse(400, parseResult.error.errors[0]?.message ?? 'Invalid request body');
    }

    const { postIds } = parseResult.data;

    // 4. Handle empty array (success case)
    if (postIds.length === 0) {
      return successResponse(200, {
        success: true,
        markedCount: 0
      });
    }

    // 5. Enforce max limit
    if (postIds.length > MAX_POST_IDS) {
      return errorResponse(400, `Cannot mark more than ${MAX_POST_IDS} posts at once`);
    }

    // 6. Mark posts as read
    const result = await feedService.markFeedItemsAsRead({
      userId,
      postIds
    });

    // 7. Return success response
    return successResponse(200, {
      success: true,
      markedCount: result.updatedCount
    });
  } catch (error) {
    console.error('[MarkReadHandler] Error marking posts as read', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return errorResponse(500, 'Failed to mark posts as read');
  }
};
