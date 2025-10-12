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
 * Handler to delete a notification
 * Only the notification owner can delete their notification
 * Idempotent - returns success even if notification doesn't exist
 *
 * @param event - API Gateway event with notification ID in path parameters
 * @returns API Gateway response with success status
 *
 * @example
 * // Request:
 * DELETE /notifications/{id}
 *
 * // Response:
 * {
 *   success: true,
 *   deletedCount: 1
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

    // Delete notification
    const result = await notificationService.deleteNotification({
      userId: authResult.userId,
      notificationId: idValidation.data
    });

    // Return response (service layer already validates data structure)
    return successResponse(200, result);
  } catch (error) {
    return handleNotificationError(error, 'deleting notification');
  }
};
