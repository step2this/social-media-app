import type { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ProfileService } from '@social-media-app/dal';
import {
  UpdateProfileWithHandleRequestSchema,
  UpdateProfileResponseSchema,
  type UpdateProfileResponse
} from '@social-media-app/shared';
import { createErrorResponse, createSuccessResponse } from '../../utils/responses.js';
import { verifyToken } from '../../utils/jwt.js';
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
 * Handler to update authenticated user's profile
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Verify authentication
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);

    if (!decoded || !decoded.userId) {
      return createErrorResponse(401, 'Invalid token');
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

    return createSuccessResponse(validatedResponse);
  } catch (error) {
    console.error('Error updating profile:', error);

    if (error instanceof z.ZodError) {
      return createErrorResponse(400, 'Invalid request data', error.errors);
    }

    if (error instanceof Error && error.message === 'Handle is already taken') {
      return createErrorResponse(409, 'Handle is already taken');
    }

    return createErrorResponse(500, 'Internal server error');
  }
};