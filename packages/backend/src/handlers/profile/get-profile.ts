import type { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ProfileService } from '@social-media-app/dal';
import {
  PublicProfileResponseSchema,
  type PublicProfileResponse
} from '@social-media-app/shared';
import { createErrorResponse, createSuccessResponse } from '../../utils/responses.js';
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
 * Handler to get a public profile by handle
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Validate path parameters
    const handle = event.pathParameters?.handle;

    if (!handle) {
      return createErrorResponse(400, 'Handle is required');
    }

    // Get profile by handle
    const profile = await profileService.getProfileByHandle(handle);

    if (!profile) {
      return createErrorResponse(404, 'Profile not found');
    }

    // Validate response
    const response: PublicProfileResponse = {
      profile
    };

    const validatedResponse = PublicProfileResponseSchema.parse(response);

    return createSuccessResponse(validatedResponse);
  } catch (error) {
    console.error('Error getting profile:', error);

    if (error instanceof z.ZodError) {
      return createErrorResponse(400, 'Invalid response data', error.errors);
    }

    return createErrorResponse(500, 'Internal server error');
  }
};