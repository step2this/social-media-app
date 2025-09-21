import { http, HttpResponse } from 'msw';
import { HelloRequestSchema, HelloResponseSchema, type HelloRequest, type HelloResponse } from '@social-media-app/shared';
import { authHandlers } from './authHandlers.js';

/**
 * Mock API handlers for development mode
 */
export const handlers = [
  // Authentication handlers
  ...authHandlers,
  // Hello endpoint handler
  http.post('http://localhost:3001/hello', async ({ request }) => {
    try {
      // Parse request body
      const body = await request.json() as HelloRequest;

      // Validate request
      const validatedRequest = HelloRequestSchema.parse(body);

      // Generate mock response
      const response: HelloResponse = {
        message: `Hello ${validatedRequest.name}!`,
        name: validatedRequest.name,
        timestamp: validatedRequest.timestamp || new Date().toISOString(),
        serverTime: new Date().toISOString()
      };

      // Validate response
      const validatedResponse = HelloResponseSchema.parse(response);

      // Add realistic delay
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));

      return HttpResponse.json(validatedResponse, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      if (error?.name === 'ZodError') {
        return HttpResponse.json(
          {
            error: 'Validation failed',
            details: error.errors
          },
          { status: 400 }
        );
      }

      console.error('Mock API error:', error);
      return HttpResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }),

  // Health check endpoint
  http.get('http://localhost:3001/health', () => {
    return HttpResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'social-media-app-mock-api'
    });
  }),

  // Catch-all for unhandled endpoints
  http.all('http://localhost:3001/*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`);
    return HttpResponse.json(
      {
        error: 'Not Found',
        message: `Endpoint ${request.method} ${new URL(request.url).pathname} not implemented in mock API`
      },
      { status: 404 }
    );
  })
];