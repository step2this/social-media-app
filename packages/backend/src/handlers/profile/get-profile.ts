import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { ProfileService } from '@social-media-app/dal';
import {
  PublicProfileResponseSchema,
  type PublicProfileResponse
} from '@social-media-app/shared';
import { errorResponse, successResponse } from '../../utils/index.js';
import {
  createDynamoDBClient,
  createS3Client,
  getTableName,
  getS3BucketName,
  getCloudFrontDomain
} from '../../utils/dynamodb.js';
import { z } from 'zod';


/**
 * Handler to get a public profile by handle
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

    // Validate path parameters
    const handle = event.pathParameters?.handle;

    if (!handle) {
      return errorResponse(400, 'Handle is required');
    }

    // Get profile by handle
    const profile = await profileService.getProfileByHandle(handle);

    if (!profile) {
      return errorResponse(404, 'Profile not found');
    }

    // Validate response
    const response: PublicProfileResponse = {
      profile
    };

    const validatedResponse = PublicProfileResponseSchema.parse(response);

    return successResponse(200, validatedResponse);
  } catch (error) {
    console.error('Error getting profile:', error);

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Invalid response data', error.errors);
    }

    return errorResponse(500, 'Internal server error');
  }
};