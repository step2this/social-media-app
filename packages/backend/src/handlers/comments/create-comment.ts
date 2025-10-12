import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { CommentService, PostService, ProfileService, NotificationService } from '@social-media-app/dal';
import {
  CreateCommentRequestSchema,
  CreateCommentResponseSchema,
  type CreateCommentResponse
} from '@social-media-app/shared';
import { errorResponse, successResponse, verifyAccessToken, getJWTConfigFromEnv } from '../../utils/index.js';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import { z } from 'zod';

/**
 * Handler to create a comment on a post
 * Validates request, authenticates user, fetches user handle from profile,
 * fetches post metadata (owner ID and SK), and creates comment
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
    const validatedRequest = CreateCommentRequestSchema.parse(body);

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

    // Fetch user profile to get handle
    const profileService = new ProfileService(dynamoClient, tableName);
    const profile = await profileService.getProfileById(decoded.userId);

    if (!profile) {
      return errorResponse(500, 'User profile not found');
    }

    // Fetch post to get metadata (owner ID and SK)
    const postService = new PostService(dynamoClient, tableName, profileService);
    const post = await postService.getPostById(validatedRequest.postId);

    if (!post) {
      return errorResponse(404, 'Post not found');
    }

    /**
     * Extract post metadata for comment creation:
     * - postUserId: User ID of the post owner (from post.userId)
     * - postSK: Reconstructed SK for the post (format: POST#<timestamp>#<postId>)
     *
     * These metadata fields are stored with the comment entity to enable:
     * - Post owner notifications (knowing who owns the post that was commented on)
     * - Efficient post entity lookup (using the post's SK)
     */
    const postUserId = post.userId;
    const postSK = `POST#${post.createdAt}#${post.id}`;

    // Create comment with post metadata
    const commentService = new CommentService(dynamoClient, tableName);
    const result = await commentService.createComment(
      decoded.userId,
      validatedRequest.postId,
      profile.handle,
      validatedRequest.content,
      postUserId,
      postSK
    );

    // Create notification for post owner (if not self-comment)
    if (decoded.userId !== postUserId) {
      try {
        const notificationService = new NotificationService(dynamoClient, tableName);
        const commentPreview = validatedRequest.content.substring(0, 50);
        const message = `${profile.handle} commented: ${commentPreview}${validatedRequest.content.length > 50 ? '...' : ''}`;

        await notificationService.createNotification({
          userId: postUserId,
          type: 'comment',
          title: 'New comment',
          message,
          priority: 'normal',
          actor: {
            userId: decoded.userId,
            handle: profile.handle,
            displayName: profile.fullName,
            avatarUrl: profile.profilePictureUrl
          },
          target: {
            type: 'post',
            id: validatedRequest.postId,
            preview: post.caption?.substring(0, 100)
          }
        });
      } catch (notificationError) {
        console.error('Failed to create notification for comment:', notificationError);
      }
    }

    // Validate response
    const validatedResponse: CreateCommentResponse = CreateCommentResponseSchema.parse(result);

    return successResponse(200, validatedResponse);
  } catch (error) {
    console.error('Error creating comment:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid request data');
    }

    // Handle validation errors from CommentService
    if (error instanceof Error && error.message.includes('Invalid comment content')) {
      return errorResponse(400, 'Invalid request data');
    }

    return errorResponse(500, 'Internal server error');
  }
};
