import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  type GetUnreadCountResponse
} from '@social-media-app/shared';
import {
  errorResponse,
  successResponse,
  authenticateRequest,
  initializeNotificationService,
  handleNotificationError
} from '../../utils/index.js';

/**
 * Handler to get count of unread notifications for the authenticated user
 * Simple GET endpoint with no query parameters
 *
 * @param event - API Gateway event
 * @returns API Gateway response with unread count
 *
 * @example
 * // Request:
 * GET /notifications/unread-count
 *
 * // Response:
 * {
 *   count: 5
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

    // Initialize service
    const notificationService = initializeNotificationService();

    // Get unread count from service
    const count = await notificationService.getUnreadCount(authResult.userId);

    // Build and return response
    const response: GetUnreadCountResponse = { count };

    return successResponse(200, response);
  } catch (error) {
    return handleNotificationError(error, 'getting unread count');
  }
};
