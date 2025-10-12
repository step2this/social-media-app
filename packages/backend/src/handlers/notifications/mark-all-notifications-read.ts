import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  NotificationTypeSchema
} from '@social-media-app/shared';
import {
  errorResponse,
  successResponse,
  authenticateRequest,
  initializeNotificationService,
  parseRequestBody,
  handleNotificationError
} from '../../utils/index.js';
import { z } from 'zod';

/**
 * Request body schema for mark-all-as-read (optional filters only)
 */
const MarkAllAsReadRequestBodySchema = z.object({
  type: NotificationTypeSchema.optional(),
  beforeDate: z.string().datetime({ offset: true }).optional()
}).optional();

/**
 * Handler to mark all notifications as read for the authenticated user
 * Supports optional filters: type and beforeDate
 * Idempotent - safe to call multiple times
 *
 * @param event - API Gateway event with optional filters in request body
 * @returns API Gateway response with count of updated notifications
 *
 * @example
 * // Request:
 * POST /notifications/read-all
 * {
 *   "type": "like",
 *   "beforeDate": "2024-01-15T10:30:00Z"
 * }
 *
 * // Response:
 * {
 *   updatedCount: 5
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

    // Parse request body (allow empty body)
    const body = parseRequestBody(event.body);

    // Validate request body (only optional filters)
    const validationResult = MarkAllAsReadRequestBodySchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(400, 'Invalid request data', validationResult.error.errors);
    }

    // Initialize service
    const notificationService = initializeNotificationService();

    // Build service call parameters
    const serviceParams: {
      userId: string;
      type?: string;
      beforeDate?: string;
    } = {
      userId: authResult.userId
    };

    if (validationResult.data?.type) {
      serviceParams.type = validationResult.data.type;
    }

    if (validationResult.data?.beforeDate) {
      serviceParams.beforeDate = validationResult.data.beforeDate;
    }

    // Mark all notifications as read
    const result = await notificationService.markAllAsRead(serviceParams);

    // Return response (service layer already validates data structure)
    return successResponse(200, result);
  } catch (error) {
    return handleNotificationError(error, 'marking all notifications as read');
  }
};
