import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { FollowService, ProfileService, NotificationService } from '@social-media-app/dal';
import {
  FollowUserRequestSchema,
  FollowUserResponseSchema,
  type FollowUserResponse
} from '@social-media-app/shared';
import { errorResponse, successResponse, verifyAccessToken, getJWTConfigFromEnv } from '../../utils/index.js';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import { z } from 'zod';

/**
 * Handler to follow a user
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
    const validatedRequest = FollowUserRequestSchema.parse(body);

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
    const followService = new FollowService(dynamoClient, tableName);

    // Follow the user
    const result = await followService.followUser(decoded.userId, validatedRequest.userId);

    // Create notification for followed user (if not self-follow)
    if (decoded.userId !== validatedRequest.userId) {
      try {
        const profileService = new ProfileService(dynamoClient, tableName);
        const actorProfile = await profileService.getProfileById(decoded.userId);

        if (actorProfile) {
          const notificationService = new NotificationService(dynamoClient, tableName);
          await notificationService.createNotification({
            userId: validatedRequest.userId,
            type: 'follow',
            title: 'New follower',
            message: `${actorProfile.handle} started following you`,
            priority: 'normal',
            actor: {
              userId: decoded.userId,
              handle: actorProfile.handle,
              displayName: actorProfile.fullName,
              avatarUrl: actorProfile.profilePictureUrl
            }
          });
        }
      } catch (notificationError) {
        console.error('Failed to create notification for follow:', notificationError);
      }
    }

    // Validate response
    const validatedResponse: FollowUserResponse = FollowUserResponseSchema.parse(result);

    return successResponse(200, validatedResponse);
  } catch (error) {
    console.error('Error following user:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid request data');
    }

    return errorResponse(500, 'Internal server error');
  }
};
