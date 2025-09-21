import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { HelloRequestSchema, HelloResponseSchema, z } from '@social-media-app/shared';
import { helloService } from '@social-media-app/dal';

/**
 * Lambda handler for hello endpoint
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Parse request body
    const body = event.body ? JSON.parse(event.body) : {};

    // Validate request using Zod schema
    const validatedRequest = HelloRequestSchema.parse(body);

    // Generate response using DAL service
    const response = helloService.generateHelloResponse(validatedRequest);

    // Validate response
    const validatedResponse = HelloResponseSchema.parse(response);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(validatedResponse)
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Validation failed',
          details: error.errors
        })
      };
    }

    console.error('Unexpected error in hello handler:', error instanceof Error ? error.message : String(error));
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Internal server error'
      })
    };
  }
};