/**
 * AWS Lambda Handler for GraphQL with OpenTelemetry
 *
 * IMPORTANT: Instrumentation is loaded first to ensure all code is traced.
 * See infrastructure/instrumentation.ts for OTel configuration.
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
 * - OpenTelemetry traces all operations automatically
 *
 * ## Request Flow
 *
 * 1. API Gateway receives HTTP request and invokes Lambda
 * 2. OpenTelemetry starts tracing (automatic instrumentation)
 * 3. Lambda handler initializes Apollo Server (if not already initialized)
 * 4. Context is created with authenticated userId, AWS clients, and DataLoaders
 * 5. Apollo Server processes the GraphQL query/mutation (traced by OTel)
 * 6. Resolvers use context to access userId, data clients, and DataLoaders
 * 7. Response is returned to API Gateway and back to client
 * 8. Trace is exported to SigNoz/observability platform
 *
 * ## Distributed Tracing
 *
 * - Every request gets a unique trace_id (propagated from Next.js if available)
 * - All logs include trace_id and span_id for correlation
 * - GraphQL operations, DynamoDB queries, and HTTP calls are automatically traced
 * - Use trace_id to correlate logs across Next.js and GraphQL services
 *
 * ## Performance Considerations
 *
 * - **Cold Start**: First invocation creates Apollo Server (~200-500ms overhead)
 * - **Warm Start**: Subsequent invocations reuse server (~50-100ms overhead)
 * - **DataLoaders**: Batch and cache data fetches within a single request
 * - **Connection Reuse**: DynamoDB client is reused across invocations
 * - **Tracing Overhead**: <5ms per request (OTel is very efficient)
 *
 * ## Security
 *
 * - JWT tokens are verified in createContext() using auth-utils
 * - Unauthenticated requests have userId = null in context
 * - Resolvers must check context.userId for protected operations
 * - CORS headers should be configured in API Gateway (not here)
 *
 * @see https://www.apollographql.com/docs/apollo-server/deployment/lambda
 * @see https://github.com/apollographql/apollo-server/tree/main/packages/integration-aws-lambda
 */

// CRITICAL: Import instrumentation FIRST to ensure all code is traced
import './infrastructure/instrumentation.js';

import type { APIGatewayProxyEvent, APIGatewayProxyEventV2, APIGatewayProxyResult, Context } from 'aws-lambda';
import { startServerAndCreateLambdaHandler, handlers } from '@as-integrations/aws-lambda';
import { trace } from '@opentelemetry/api';
import { getOrCreateCorrelationId, addCorrelationIdToHeaders } from '@social-media-app/shared';
import { createApolloServerWithPothos } from './server-with-pothos.js';
import { createContext } from './context.js';
import { logger, logGraphQLOperation } from './infrastructure/logger.js';

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
        sourceIp: event.requestContext.identity?.sourceIp || '0.0.0.0',
        userAgent: event.requestContext.identity?.userAgent || '',
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
let serverInstance: Awaited<ReturnType<typeof createApolloServerWithPothos>> | null = null;

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

  // Get current trace context from OpenTelemetry
  const span = trace.getActiveSpan();
  const traceId = span?.spanContext().traceId || 'no-trace';

  // Create child logger with request context
  const requestLogger = logger.child({
    correlationId,
    requestId: event.requestContext?.requestId,
  });

  try {
    // Initialize Apollo Server on first invocation (cold start)
    if (!serverInstance) {
      requestLogger.info('Creating Apollo Server with Pothos schema (COLD START)');
      serverInstance = createApolloServerWithPothos();
      await serverInstance.start();
      requestLogger.info('Apollo Server with Pothos started successfully');
    } else {
      requestLogger.debug('Reusing existing Apollo Server instance (WARM START)');
    }

    // Log request start
    requestLogger.info({
      path: event.path,
      method: event.httpMethod,
      hasAuth: !!event.headers?.authorization,
    }, 'Processing GraphQL request');

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
            // Log context creation error
            requestLogger.error({ error }, 'Failed to create GraphQL context');
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
      requestLogger.error('Lambda handler returned void (unexpected)');
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
    requestLogger.info({
      statusCode: result.statusCode,
      duration,
    }, 'GraphQL request completed successfully');

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

    // Log error with full context
    requestLogger.error({
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      duration,
    }, 'GraphQL request failed');

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
