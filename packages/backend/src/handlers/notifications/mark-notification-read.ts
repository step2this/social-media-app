import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  errorResponse,
  successResponse,
  authenticateRequest,
  initializeNotificationService,
  validateUUID,
  handleNotificationError
} from '../../utils/index.js';

/**
 * Handler to mark a notification as read
 * Only the notification owner can mark their notification as read
 * Idempotent - returns success even if notification is already read or doesn't exist
 *
 * @param event - API Gateway event with notification ID in path parameters
 * @returns API Gateway response with updated notification
 *
 * @example
 * // Request:
 * POST /notifications/{id}/read
 *
 * // Response:
 * {
 *   notification: {
 *     id: "...",
 *     status: "read",
 *     readAt: "2024-01-15T10:30:00Z",
 *     ...
 *   }
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

    // Validate notification ID from path parameters
    const idValidation = validateUUID(event.pathParameters?.id);
    if (!idValidation.success) {
      return errorResponse(idValidation.statusCode, idValidation.message, idValidation.errors);
    }

    // Initialize service
    const notificationService = initializeNotificationService();

    // Mark notification as read
    const result = await notificationService.markAsRead({
      userId: authResult.userId,
      notificationId: idValidation.data
    });

    // Return response (service layer already validates data structure)
    return successResponse(200, result);
  } catch (error) {
    return handleNotificationError(error, 'marking notification as read');
  }
};
