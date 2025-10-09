import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { ProfileService, FollowService } from '@social-media-app/dal';
import {
  PublicProfileResponseSchema,
  type PublicProfileResponse
} from '@social-media-app/shared';
import { errorResponse, successResponse, verifyAccessToken, getJWTConfigFromEnv } from '../../utils/index.js';
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
 * Optionally includes isFollowing status when user is authenticated
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

    // Check follow status if user is authenticated
    let isFollowing: boolean | undefined = undefined;

    try {
      const authHeader = event.headers.authorization || event.headers.Authorization;

      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const jwtConfig = getJWTConfigFromEnv();
        const decoded = await verifyAccessToken(token, jwtConfig.secret);

        if (decoded?.userId && profile.id) {
          // Only check follow status if not viewing own profile
          if (decoded.userId !== profile.id) {
            const followService = new FollowService(dynamoClient, tableName);
            const followStatus = await followService.getFollowStatus(decoded.userId, profile.id);
            isFollowing = followStatus.isFollowing;
          }
        }
      }
    } catch (authError) {
      // Authentication failed or invalid token - continue without follow status
      // This is not an error - just means profile is viewed by unauthenticated user
      console.log('Profile viewed without authentication or invalid token');
    }

    // Validate response
    const response: PublicProfileResponse = {
      profile: {
        ...profile,
        isFollowing
      }
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