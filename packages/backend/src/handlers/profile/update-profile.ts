import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { ProfileService } from '@social-media-app/dal';
import {
  UpdateProfileWithHandleRequestSchema,
  UpdateProfileResponseSchema,
  type UpdateProfileResponse
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

/**
 * Handler to update authenticated user's profile
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
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
    const validatedRequest = UpdateProfileWithHandleRequestSchema.parse(body);

    // Update profile
    const updatedProfile = await profileService.updateProfile(
      decoded.userId,
      validatedRequest
    );

    // Validate response
    const response: UpdateProfileResponse = {
      profile: updatedProfile,
      message: 'Profile updated successfully'
    };

    const validatedResponse = UpdateProfileResponseSchema.parse(response);

    return successResponse(200, validatedResponse);
  } catch (error) {
    console.error('Error updating profile:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid request data', error.errors);
    }

    if (error instanceof Error && error.message === 'Handle is already taken') {
      return errorResponse(409, 'Handle is already taken');
    }

    return errorResponse(500, 'Internal server error');
  }
};