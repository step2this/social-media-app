import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { LikeService, KinesisEventPublisher, ProfileService } from '@social-media-app/dal';
import {
  UnlikePostRequestSchema,
  UnlikePostResponseSchema,
  type UnlikePostResponse,
  type PostLikedEvent
} from '@social-media-app/shared';
import { errorResponse, successResponse, verifyAccessToken, getJWTConfigFromEnv } from '../../utils/index.js';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import { createKinesisClient, getKinesisStreamName } from '../../utils/aws-config.js';
import { randomUUID } from 'crypto';
import { z } from 'zod';

// Initialize Kinesis publisher at container scope for warm start optimization
const kinesisClient = createKinesisClient();
const streamName = getKinesisStreamName();
const kinesisPublisher = new KinesisEventPublisher(kinesisClient, streamName);

/**
 * Handler to unlike a post
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
    const validatedRequest = UnlikePostRequestSchema.parse(body);

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
    const likeService = new LikeService(dynamoClient, tableName);

    // Unlike the post
    const result = await likeService.unlikePost(decoded.userId, validatedRequest.postId);

    // Publish POST_LIKED event to Kinesis (with liked: false for unlike)
    try {
      // Fetch user profile to get handle
      const profileService = new ProfileService(dynamoClient, tableName);
      const userProfile = await profileService.getProfileById(decoded.userId);
      const userHandle = userProfile?.handle || 'unknown';

      const likeEvent: PostLikedEvent = {
        eventId: randomUUID(),
        timestamp: new Date().toISOString(),
        eventType: 'POST_LIKED',
        version: '1.0',
        userId: decoded.userId,
        userHandle,
        postId: validatedRequest.postId,
        liked: false // false indicates an unlike
      };

      await kinesisPublisher.publishEvent(likeEvent);

      console.log('[UnlikePost] Published POST_LIKED event', {
        postId: validatedRequest.postId,
        userId: decoded.userId,
        userHandle,
        liked: false
      });
    } catch (error) {
      // Log error but don't fail the request
      // The unlike was processed successfully in DynamoDB
      console.error('[UnlikePost] Failed to publish Kinesis event (non-blocking)', {
        postId: validatedRequest.postId,
        userId: decoded.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Validate response
    const validatedResponse: UnlikePostResponse = UnlikePostResponseSchema.parse(result);

    return successResponse(200, validatedResponse);
  } catch (error) {
    console.error('Error unliking post:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid request data');
    }

    return errorResponse(500, 'Internal server error');
  }
};
