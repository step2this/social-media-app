import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { ProfileService } from '@social-media-app/dal';
import { ProfileResponseSchema } from '@social-media-app/shared';
import {
  createDynamoDBClient,
  getTableName,
  createS3Client,
  getS3BucketName,
  getCloudFrontDomain
} from '../../utils/dynamodb.js';
import {
  getJWTConfigFromEnv,
  extractTokenFromHeader,
  verifyAccessToken
} from '../../utils/jwt.js';
import { errorResponse, successResponse } from '../../utils/responses.js';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    // Extract and verify JWT token
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    const token = extractTokenFromHeader(authHeader);
    if (!token) {
      return errorResponse(401, 'Access token required');
    }

    const jwtConfig = getJWTConfigFromEnv();
    const payload = await verifyAccessToken(token, jwtConfig.secret);
    if (!payload) {
      return errorResponse(401, 'Invalid access token');
    }

    // Initialize services
    const dynamoClient = createDynamoDBClient();
    const tableName = getTableName();
    const s3Client = createS3Client();
    const bucketName = getS3BucketName();
    const cloudFrontDomain = getCloudFrontDomain();

    const profileService = new ProfileService(
      dynamoClient,
      tableName,
      bucketName,
      cloudFrontDomain,
      s3Client
    );

    // Get user profile
    const profile = await profileService.getProfileById(payload.userId);

    if (!profile) {
      return errorResponse(404, 'Profile not found');
    }

    // Validate response format
    const response = { profile };
    const validatedResponse = ProfileResponseSchema.parse(response);

    return successResponse(200, validatedResponse);

  } catch (error) {
    console.error('Error in get-current-profile handler:', error);
    return errorResponse(500, 'Internal server error');
  }
};