import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { ProfileService } from '@social-media-app/dal';
import {
  GetPresignedUrlRequestSchema,
  GetPresignedUrlResponseSchema
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
 * Handler to get presigned URL for file upload
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Initialize AWS services and configuration at runtime
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

    return successResponse(200, validatedResponse);
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