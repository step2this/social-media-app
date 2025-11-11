/**
 * AWS Lambda Handler for GraphQL
 *
 * Integrates Apollo Server with AWS Lambda using @as-integrations/aws-lambda.
 * This handler is the entry point for all GraphQL requests via API Gateway.
 *
 * ## Architecture Overview
 *
 * This Lambda function follows the "singleton pattern" for Apollo Server:
 * - Server instance is created once and reused across invocations (warm starts)
 * - Context is created fresh for each request (contains request-specific data)
 * - DataLoaders are created per-request to batch queries within a single request
 *
 * ## Request Flow
 *
 * 1. API Gateway receives HTTP request and invokes Lambda
 * 2. Lambda handler initializes Apollo Server (if not already initialized)
 * 3. Context is created with authenticated userId, AWS clients, and DataLoaders
 * 4. Apollo Server processes the GraphQL query/mutation
 * 5. Resolvers use context to access userId, data clients, and DataLoaders
 * 6. Response is returned to API Gateway and back to client
 *
 * ## Performance Considerations
 *
 * - **Cold Start**: First invocation creates Apollo Server (~200-500ms overhead)
 * - **Warm Start**: Subsequent invocations reuse server (~50-100ms overhead)
 * - **DataLoaders**: Batch and cache data fetches within a single request
 * - **Connection Reuse**: DynamoDB client is reused across invocations
 *
 * ## Security
 *
 * - JWT tokens are verified in createContext() using auth-utils
 * - Unauthenticated requests have userId = null in context
 * - Resolvers must check context.userId for protected operations
 * - CORS headers should be configured in API Gateway (not here)
 *
 * ## Implementation Checklist
 *
 * TODO Phase 1: Basic Server Setup
 * - [ ] Uncomment imports for createApolloServer and createContext
 * - [ ] Uncomment serverInstance singleton variable
 * - [ ] Initialize Apollo Server on first invocation
 * - [ ] Convert event from APIGatewayProxyEvent to APIGatewayProxyEventV2
 * - [ ] Create context for each request
 * - [ ] Call Apollo Server handler with startServerAndCreateLambdaHandler
 * - [ ] Add error handling for server initialization failures
 * - [ ] Add error handling for GraphQL execution failures
 *
 * TODO Phase 2: DataLoaders Integration (requires server.ts implementation)
 * - [ ] Pass DataLoader factories to context creation
 * - [ ] Ensure DataLoaders are created fresh per-request (not cached in singleton)
 * - [ ] Add DataLoader for profiles (batch profile fetches)
 * - [ ] Add DataLoader for posts (batch post fetches)
 * - [ ] Add DataLoader for like status (batch like checks)
 * - [ ] Add DataLoader for follow status (batch follow checks)
 *
 * TODO Phase 3: Monitoring & Observability
 * - [ ] Add CloudWatch metrics for cold starts vs warm starts
 * - [ ] Add CloudWatch metrics for GraphQL operation types (query/mutation)
 * - [ ] Add CloudWatch metrics for authentication success/failure
 * - [ ] Add structured logging with correlation IDs
 * - [ ] Add X-Ray tracing for performance analysis
 * - [ ] Log GraphQL errors to CloudWatch with full context
 *
 * TODO Phase 4: Advanced Features
 * - [ ] Add request timeout handling (API Gateway has 30s limit)
 * - [ ] Add request size validation (API Gateway has 10MB limit)
 * - [ ] Add rate limiting metadata to context (if using API Gateway throttling)
 * - [ ] Add support for GraphQL subscriptions (requires WebSocket API)
 * - [ ] Add health check endpoint for ALB/API Gateway health checks
 * - [ ] Add introspection control (disable in production)
 *
 * TODO Phase 5: Testing
 * - [ ] Add integration tests for Lambda handler
 * - [ ] Test cold start behavior
 * - [ ] Test warm start behavior with server reuse
 * - [ ] Test authenticated vs unauthenticated requests
 * - [ ] Test invalid JWT tokens
 * - [ ] Test malformed GraphQL queries
 * - [ ] Test GraphQL validation errors
 * - [ ] Test resolver errors
 * - [ ] Test DataLoader batching behavior
 * - [ ] Test timeout scenarios
 *
 * @see https://www.apollographql.com/docs/apollo-server/deployment/lambda
 * @see https://github.com/apollographql/apollo-server/tree/main/packages/integration-aws-lambda
 */

import type { APIGatewayProxyEvent, APIGatewayProxyEventV2, APIGatewayProxyResult, Context } from 'aws-lambda';
import { startServerAndCreateLambdaHandler, handlers } from '@as-integrations/aws-lambda';
import { 
  getOrCreateCorrelationId,
  addCorrelationIdToHeaders,
  createStructuredLogger,
  logError 
} from '@social-media-app/shared';
import { createApolloServer } from './server.js';
import { createContext } from './context.js';

/**
 * Convert API Gateway Proxy Event V1 to V2 format
 * This is needed because our handler accepts V1 events but Apollo integration uses V2
 */
function convertV1ToV2(event: APIGatewayProxyEvent): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: event.path,
    rawQueryString: event.queryStringParameters
      ? Object.entries(event.queryStringParameters)
          .map(([k, v]) => `${k}=${v}`)
          .join('&')
      : '',
    headers: event.headers as Record<string, string>,
    requestContext: {
      accountId: event.requestContext.accountId,
      apiId: event.requestContext.apiId,
      domainName: event.requestContext.domainName,
      domainPrefix: '',
      http: {
        method: event.httpMethod,
        path: event.path,
        protocol: event.requestContext.protocol,
        sourceIp: event.requestContext.identity.sourceIp,
        userAgent: event.requestContext.identity.userAgent || '',
      },
      requestId: event.requestContext.requestId,
      routeKey: '$default',
      stage: event.requestContext.stage,
      time: '',
      timeEpoch: 0,
    },
    body: event.body,
    isBase64Encoded: event.isBase64Encoded,
  } as APIGatewayProxyEventV2;
}

// Server instance will be created outside the handler for reuse across invocations (singleton pattern)
let serverInstance: Awaited<ReturnType<typeof createApolloServer>> | null = null;

/**
 * AWS Lambda handler for GraphQL requests
 *
 * This is the entry point that API Gateway invokes. It:
 * 1. Initializes Apollo Server (once, on cold start)
 * 2. Creates request context (per-request, includes auth and DataLoaders)
 * 3. Delegates to Apollo Server's Lambda integration
 *
 * @param event - API Gateway proxy event containing HTTP request data
 * @param lambdaContext - Lambda execution context (contains request ID, etc)
 * @returns API Gateway proxy result with HTTP response data
 *
 * @example
 * // Example event structure from API Gateway:
 * {
 *   "headers": {
 *     "authorization": "Bearer eyJhbGc...",
 *     "content-type": "application/json"
 *   },
 *   "body": "{\"query\":\"{ me { id handle } }\"}",
 *   "requestContext": {
 *     "requestId": "abc123",
 *     "identity": { ... }
 *   }
 * }
 *
 * @example
 * // Example successful response:
 * {
 *   "statusCode": 200,
 *   "headers": {
 *     "Content-Type": "application/json"
 *   },
 *   "body": "{\"data\":{\"me\":{\"id\":\"user123\",\"handle\":\"john_doe\"}}}"
 * }
 *
 * @example
 * // Example error response:
 * {
 *   "statusCode": 200,  // GraphQL returns 200 even for errors
 *   "headers": {
 *     "Content-Type": "application/json"
 *   },
 *   "body": "{\"errors\":[{\"message\":\"Unauthorized\",\"extensions\":{\"code\":\"UNAUTHENTICATED\"}}]}"
 * }
 */
export async function handler(
  event: APIGatewayProxyEvent,
  lambdaContext: Context
): Promise<APIGatewayProxyResult> {
  // Extract or generate correlation ID for this request
  const correlationId = getOrCreateCorrelationId(
    event.headers || {},
    event.requestContext?.requestId
  );
  const startTime = Date.now();

  // Create logger instance for this request
  const logger = createStructuredLogger({
    correlationId,
    defaultMetadata: { service: 'graphql-server' }
  });

  try {
    // Initialize Apollo Server on first invocation (cold start)
    if (!serverInstance) {
      logger.info('COLD_START', 'Creating Apollo Server instance');
      serverInstance = createApolloServer();
      await serverInstance.start();
      logger.info('SERVER_STARTED', 'Apollo Server started successfully');
    } else {
      logger.info('WARM_START', 'Reusing existing Apollo Server instance');
    }

    // Log request start
    logger.info('REQUEST_START', 'Processing GraphQL request', {
      path: event.path,
      method: event.httpMethod
    });

    // Create Lambda handler with Apollo Server integration
    // Uses APIGatewayProxyEventV2 request handler which is compatible with our context
    // Note: Type assertion needed due to @as-integrations/aws-lambda not having proper ESM exports
    // This causes TypeScript NodeNext to see separate ESM/CJS type declarations
    const lambdaHandler = startServerAndCreateLambdaHandler(
      serverInstance as any,
      handlers.createAPIGatewayProxyEventV2RequestHandler(),
      {
        // Create context for each request
        // Context includes authenticated userId, DynamoDB client, and correlation ID
        context: async ({ event: eventV2 }) => {
          try {
            // createContext already generates correlationId from the event
            return await createContext(eventV2);
          } catch (error) {
            // Use correlationId from outer scope for error logging
            logError('CONTEXT_ERROR', correlationId, error as Error, {
              service: 'graphql-server'
            });
            throw error;
          }
        },
      }
    );

    // Execute the GraphQL request
    // Convert V1 event to V2 format for the handler
    const eventV2 = convertV1ToV2(event);
    const result = await lambdaHandler(eventV2, lambdaContext, {} as any);
    
    const duration = Date.now() - startTime;
    
    // Handle void return (should not happen in normal operation)
    if (!result) {
      logger.error('HANDLER_ERROR', 'Lambda handler returned void');
      return {
        statusCode: 500,
        headers: addCorrelationIdToHeaders(
          { 'Content-Type': 'application/json' },
          correlationId
        ),
        body: JSON.stringify({
          errors: [
            {
              message: 'Internal server error',
              extensions: {
                code: 'INTERNAL_SERVER_ERROR',
              },
            },
          ],
        }),
      };
    }
    
    // Log successful response
    logger.info('REQUEST_COMPLETE', 'GraphQL request completed successfully', {
      statusCode: result.statusCode,
      duration
    });

    // Add correlation ID to response headers
    return {
      ...result,
      headers: addCorrelationIdToHeaders(
        result.headers as Record<string, string>,
        correlationId
      )
    } as APIGatewayProxyResult;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Log error using shared utility
    logError('REQUEST_ERROR', correlationId, error as Error, {
      duration,
      service: 'graphql-server'
    });

    return {
      statusCode: 500,
      headers: addCorrelationIdToHeaders(
        { 'Content-Type': 'application/json' },
        correlationId
      ),
      body: JSON.stringify({
        errors: [
          {
            message: 'Internal server error',
            extensions: {
              code: 'INTERNAL_SERVER_ERROR',
            },
          },
        ],
      }),
    };
  }
}
