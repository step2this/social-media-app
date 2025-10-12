import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  errorResponse,
  successResponse,
  authenticateRequest,
  initializeNotificationService,
  handleNotificationError
} from '../../utils/index.js';
import { z } from 'zod';

/**
 * Handler to get notifications for the authenticated user
 * Supports pagination and filtering by status
 *
 * @param event - API Gateway event with query parameters
 * @returns API Gateway response with notifications list
 *
 * @example
 * // Request:
 * GET /notifications?limit=20&cursor=abc123&filter=unread
 *
 * // Response:
 * {
 *   notifications: [...],
 *   totalCount: 150,
 *   unreadCount: 12,
 *   hasMore: true,
 *   nextCursor: "cursor-string"
 * }
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Authenticate request
    const authResult = await authenticateRequest(event);
    if (!authResult.success) {
      return errorResponse(authResult.statusCode, authResult.message);
    }

    // Parse and validate query parameters
    const limitParam = event.queryStringParameters?.limit;
    const limit = limitParam ? parseInt(limitParam, 10) : 20;
    const cursor = event.queryStringParameters?.cursor;
    const filter = event.queryStringParameters?.filter;

    // Validate limit is within range
    const LimitSchema = z.number().int().min(1).max(100);
    const limitValidation = LimitSchema.safeParse(limit);

    if (!limitValidation.success) {
      return errorResponse(400, 'Invalid request data', limitValidation.error.errors);
    }

    // Validate filter if provided
    if (filter && !['all', 'unread'].includes(filter)) {
      return errorResponse(400, 'Invalid request data', [
        { path: ['filter'], message: 'Filter must be "all" or "unread"' }
      ]);
    }

    // Initialize service
    const notificationService = initializeNotificationService();

    // Build service call parameters
    const serviceParams: {
      userId: string;
      limit: number;
      cursor?: string;
      status?: 'unread';
    } = {
      userId: authResult.userId,
      limit: limitValidation.data
    };

    if (cursor) {
      serviceParams.cursor = cursor;
    }

    // Add status filter if filter is 'unread' (not 'all')
    if (filter === 'unread') {
      serviceParams.status = 'unread';
    }

    // Get notifications from service
    const notificationsData = await notificationService.getNotifications(serviceParams);

    // Return response (service layer already validates data structure)
    return successResponse(200, notificationsData);
  } catch (error) {
    return handleNotificationError(error, 'getting notifications');
  }
};
