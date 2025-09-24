import type { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ProfileService } from '@social-media-app/dal';
import {
  GetPresignedUrlRequestSchema,
  GetPresignedUrlResponseSchema,
  type GetPresignedUrlResponse
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

/**
 * Handler to get presigned URL for file upload
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

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    const validatedRequest = GetPresignedUrlRequestSchema.parse(body);

    // Generate presigned URL
    const presignedUrlData = await profileService.generatePresignedUrl(
      decoded.userId,
      validatedRequest
    );

    // Validate response
    const validatedResponse = GetPresignedUrlResponseSchema.parse(presignedUrlData);

    return successResponse(validatedResponse);
  } catch (error) {
    console.error('Error generating presigned URL:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid request data', error.errors);
    }

    if (error instanceof Error && error.message === 'S3 bucket not configured') {
      return errorResponse(500, 'Storage service not configured');
    }

    return errorResponse(500, 'Internal server error');
  }
};