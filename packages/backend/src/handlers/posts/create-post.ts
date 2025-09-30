import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { PostService, ProfileService } from '@social-media-app/dal';
import {
  CreatePostRequestSchema,
  CreatePostResponseSchema,
  type CreatePostResponse
} from '@social-media-app/shared';
import { errorResponse, successResponse, verifyAccessToken, getJWTConfigFromEnv } from '../../utils/index.js';
import {
  createDynamoDBClient,
  createS3Client,
  getTableName,
  getS3BucketName,
  getCloudFrontDomain
} from '../../utils/aws-config.js';
import { z } from 'zod';

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
        fileType: 'image/jpeg', // Default, client should specify actual type
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

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid request data', error.errors);
    }

    if (error instanceof Error && error.message === 'S3 bucket not configured') {
      return errorResponse(500, 'Storage service not configured');
    }

    return errorResponse(500, 'Internal server error');
  }
};