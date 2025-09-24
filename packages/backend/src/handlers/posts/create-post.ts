import type { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { PostService, ProfileService } from '@social-media-app/dal';
import {
  CreatePostRequestSchema,
  CreatePostResponseSchema,
  type CreatePostResponse
} from '@social-media-app/shared';
import { errorResponse, successResponse, verifyAccessToken } from '../../utils/index.js';
import { z } from 'zod';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const tableName = process.env.TABLE_NAME || 'social-media-app';

const profileService = new ProfileService(
  docClient,
  tableName,
  process.env.MEDIA_BUCKET_NAME,
  process.env.CLOUDFRONT_DOMAIN
);

const postService = new PostService(docClient, tableName, profileService);

/**
 * Handler to create a new post
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Verify authentication
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse(401, 'Unauthorized');
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    if (!decoded || !decoded.userId) {
      return errorResponse(401, 'Invalid token');
    }

    // Get user profile to get handle
    const userProfile = await profileService.getProfileById(decoded.userId);
    if (!userProfile) {
      return errorResponse(404, 'User profile not found');
    }

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    const validatedRequest = CreatePostRequestSchema.parse(body);

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

    return successResponse(validatedResponse);
  } catch (error) {
    console.error('Error creating post:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid request data', error.errors);
    }

    return errorResponse(500, 'Internal server error');
  }
};