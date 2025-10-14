import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { LikeService, PostService, ProfileService, NotificationService, KinesisEventPublisher } from '@social-media-app/dal';
import {
  LikePostRequestSchema,
  LikePostResponseSchema,
  type LikePostResponse,
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
 * Handler to like a post
 * Validates request, authenticates user, fetches post metadata (owner ID and SK), and creates like
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
    const validatedRequest = LikePostRequestSchema.parse(body);

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

    // Fetch post to get metadata (owner ID and SK)
    const profileService = new ProfileService(dynamoClient, tableName);
    const postService = new PostService(dynamoClient, tableName, profileService);
    const post = await postService.getPostById(validatedRequest.postId);

    if (!post) {
      return errorResponse(404, 'Post not found');
    }

    /**
     * Extract post metadata for like creation:
     * - postUserId: User ID of the post owner (from post.userId)
     * - postSK: Reconstructed SK for the post (format: POST#<timestamp>#<postId>)
     *
     * These metadata fields are stored with the like entity to enable:
     * - Post owner notifications (knowing who owns the post that was liked)
     * - Efficient post entity lookup (using the post's SK)
     */
    const postUserId = post.userId;
    const postSK = `POST#${post.createdAt}#${post.id}`;

    // Like the post with metadata
    const likeService = new LikeService(dynamoClient, tableName);
    const result = await likeService.likePost(
      decoded.userId,
      validatedRequest.postId,
      postUserId,
      postSK
    );

    // Publish POST_LIKED event to Kinesis
    try {
      // Fetch user profile to get handle
      const dynamoClient = createDynamoDBClient();
      const tableName = getTableName();
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
        liked: true
      };

      await kinesisPublisher.publishEvent(likeEvent);

      console.log('[LikePost] Published POST_LIKED event', {
        postId: validatedRequest.postId,
        userId: decoded.userId,
        userHandle,
        liked: true
      });
    } catch (error) {
      // Log error but don't fail the request
      // The like was created successfully in DynamoDB
      console.error('[LikePost] Failed to publish Kinesis event (non-blocking)', {
        postId: validatedRequest.postId,
        userId: decoded.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Create notification for post owner (if not self-like)
    if (decoded.userId !== postUserId) {
      try {
        const actorProfile = await profileService.getProfileById(decoded.userId);

        if (actorProfile) {
          const notificationService = new NotificationService(dynamoClient, tableName);
          await notificationService.createNotification({
            userId: postUserId,
            type: 'like',
            title: 'New like',
            message: `${actorProfile.handle} liked your post`,
            priority: 'normal',
            actor: {
              userId: decoded.userId,
              handle: actorProfile.handle,
              displayName: actorProfile.fullName,
              avatarUrl: actorProfile.profilePictureUrl
            },
            target: {
              type: 'post',
              id: validatedRequest.postId,
              url: `/post/${validatedRequest.postId}`,
              preview: post.caption?.substring(0, 100)
            }
          });
        }
      } catch (notificationError) {
        console.error('Failed to create notification for like:', notificationError);
      }
    }

    // Validate response
    const validatedResponse: LikePostResponse = LikePostResponseSchema.parse(result);

    return successResponse(200, validatedResponse);
  } catch (error) {
    console.error('Error liking post:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid request data');
    }

    return errorResponse(500, 'Internal server error');
  }
};
