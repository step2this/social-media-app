import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { PostService, ProfileService, KinesisEventPublisher } from '@social-media-app/dal';
import {
  CreatePostRequestSchema,
  CreatePostResponseSchema,
  type CreatePostResponse,
  type PostCreatedEvent
} from '@social-media-app/shared';
import { errorResponse, enhancedErrorResponse, successResponse, verifyAccessToken, getJWTConfigFromEnv } from '../../utils/index.js';
import {
  createDynamoDBClient,
  createS3Client,
  getTableName,
  getS3BucketName,
  getCloudFrontDomain
} from '../../utils/dynamodb.js';
import { createKinesisClient, getKinesisStreamName } from '../../utils/aws-config.js';
import { randomUUID } from 'crypto';
import { z } from 'zod';

// Initialize Kinesis publisher at container scope for warm start optimization
const kinesisClient = createKinesisClient();
const streamName = getKinesisStreamName();
const kinesisPublisher = new KinesisEventPublisher(kinesisClient, streamName);

/**
 * Handler to create a new post
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
    const validatedRequest = CreatePostRequestSchema.parse(body);

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

    // Initialize dependencies
    const dynamoClient = createDynamoDBClient();
    const s3Client = createS3Client();
    const tableName = getTableName();
    const s3BucketName = getS3BucketName();
    const cloudFrontDomain = getCloudFrontDomain();

    const profileService = new ProfileService(
      dynamoClient,
      tableName,
      s3BucketName,
      cloudFrontDomain,
      s3Client
    );

    const postService = new PostService(dynamoClient, tableName, profileService);

    // Get user profile to get handle
    const userProfile = await profileService.getProfileById(decoded.userId);
    if (!userProfile) {
      return errorResponse(404, 'User profile not found');
    }

    // Generate presigned URLs for image upload
    const imageUploadData = await profileService.generatePresignedUrl(
      decoded.userId,
      {
        fileType: validatedRequest.fileType,
        purpose: 'post-image'
      }
    );

    // Create placeholder post (will be updated after image upload)
    const post = await postService.createPost(
      decoded.userId,
      userProfile.handle,
      validatedRequest,
      imageUploadData.publicUrl,
      imageUploadData.thumbnailUrl || imageUploadData.publicUrl
    );

    // Publish POST_CREATED event to Kinesis
    try {
      const postCreatedEvent: PostCreatedEvent = {
        eventId: randomUUID(),
        timestamp: new Date().toISOString(),
        eventType: 'POST_CREATED',
        version: '1.0',
        postId: post.id,
        authorId: decoded.userId,
        authorHandle: userProfile.handle,
        caption: post.caption,
        imageUrl: post.imageUrl,
        isPublic: post.isPublic ?? true,
        createdAt: post.createdAt
      };

      await kinesisPublisher.publishEvent(postCreatedEvent);

      console.log('[CreatePost] Published POST_CREATED event', {
        postId: post.id,
        eventId: postCreatedEvent.eventId
      });
    } catch (error) {
      // Log error but don't fail the request
      // The post was created successfully in DynamoDB
      console.error('[CreatePost] Failed to publish Kinesis event (non-blocking)', {
        postId: post.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Validate response
    const response: CreatePostResponse = {
      post,
      uploadUrl: imageUploadData.uploadUrl,
      thumbnailUploadUrl: imageUploadData.uploadUrl // For now, same URL
    };

    const validatedResponse = CreatePostResponseSchema.parse(response);

    return successResponse(201, validatedResponse);
  } catch (error) {
    console.error('Error creating post:', error);

    // Prepare context information for diagnostics
    const errorContext = {
      userId: event.headers.authorization ? 'authenticated' : 'not authenticated',
      hasBody: !!event.body,
      bodyLength: event.body?.length || 0,
      userAgent: event.headers['user-agent'] || 'unknown',
      requestId: event.requestContext?.requestId || 'unknown'
    };

    if (error instanceof z.ZodError) {
      return enhancedErrorResponse(
        400,
        'Invalid request data',
        error,
        { ...errorContext, validationErrors: error.errors }
      );
    }

    if (error instanceof Error && error.message === 'S3 bucket not configured') {
      return enhancedErrorResponse(
        500,
        'Storage service not configured',
        error,
        errorContext
      );
    }

    // For any other error, provide enhanced diagnostics
    return enhancedErrorResponse(
      500,
      'Internal server error',
      error,
      errorContext
    );
  }
};