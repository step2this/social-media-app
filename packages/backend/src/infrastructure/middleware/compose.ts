/**
 * Middleware Composition for Backend Lambda Handlers
 *
 * Provides a functional composition pattern for chaining multiple middleware functions.
 * Middleware are executed in order, with each middleware having the opportunity to:
 * - Modify the context
 * - Short-circuit the chain by returning early
 * - Pass control to the next middleware
 *
 * @example
 * ```typescript
 * export const handler = compose(
 *   withCORS(),
 *   withTracing(),
 *   withAuth(),
 *   withValidation(LoginRequestSchema),
 *   withServices(['authService']),
 *   withErrorHandling(),
 *   async (event, context) => {
 *     const result = await context.services.authService.login(context.validatedInput);
 *     return successResponse(200, result);
 *   }
 * );
 * ```
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

/**
 * Middleware function signature.
 *
 * @param event - AWS API Gateway event
 * @param context - Shared context object that middleware can modify
 * @param next - Function to call the next middleware in the chain
 * @returns Promise resolving to the API Gateway response
 */
export type Middleware = (
  event: APIGatewayProxyEventV2,
  context: MiddlewareContext,
  next: () => Promise<APIGatewayProxyResultV2>
) => Promise<APIGatewayProxyResultV2>;

/**
 * Final handler function signature (the last function in the composition).
 *
 * @param event - AWS API Gateway event
 * @param context - Shared context with data from all middleware
 * @returns Promise resolving to the API Gateway response
 */
export type FinalHandler = (
  event: APIGatewayProxyEventV2,
  context: MiddlewareContext
) => Promise<APIGatewayProxyResultV2>;

/**
 * Shared context object passed through the middleware chain.
 * Middleware can add properties to this context.
 */
export interface MiddlewareContext {
  /** Original event (for reference) */
  event: APIGatewayProxyEventV2;

  /** User ID from authentication (added by withAuth) */
  userId?: string;

  /** Full auth payload (added by withAuth) */
  authPayload?: any;

  /** Validated input (added by withValidation) */
  validatedInput?: any;

  /** Resolved services (added by withServices) */
  services?: Record<string, any>;

  /** Additional custom properties */
  [key: string]: any;
}

/**
 * Compose multiple middleware functions into a single Lambda handler.
 *
 * Middleware are executed left-to-right (first to last in the arguments).
 * The last function should be the final handler that returns the response.
 *
 * Each middleware receives:
 * - event: The original API Gateway event
 * - context: Shared context object (can be modified)
 * - next: Function to call the next middleware
 *
 * Middleware can:
 * - Modify the context for downstream middleware
 * - Short-circuit by returning early (not calling next)
 * - Pass control by calling next()
 *
 * @param middlewares - Variable number of middleware functions, ending with the final handler
 * @returns AWS Lambda handler function
 *
 * @example
 * ```typescript
 * export const handler = compose(
 *   withAuth(),              // Adds context.userId
 *   withValidation(schema),  // Adds context.validatedInput
 *   async (event, context) => {
 *     // Final handler with access to context.userId and context.validatedInput
 *     return successResponse(200, { user: context.userId });
 *   }
 * );
 * ```
 */
export function compose(
  ...middlewares: [...Middleware[], FinalHandler]
): (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyResultV2> {
  // Validate we have at least one handler
  if (middlewares.length === 0) {
    throw new Error('compose() requires at least one middleware or handler');
  }

  return async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    // Initialize context with the event
    const context: MiddlewareContext = { event };

    // Create the execution chain
    const executeMiddleware = async (index: number): Promise<APIGatewayProxyResultV2> => {
      // If we've reached the last function (final handler), execute it
      if (index === middlewares.length - 1) {
        const finalHandler = middlewares[index] as FinalHandler;
        return finalHandler(event, context);
      }

      // Otherwise, execute the current middleware with a next() function
      const middleware = middlewares[index] as Middleware;
      return middleware(event, context, () => executeMiddleware(index + 1));
    };

    // Start the chain from the first middleware
    return executeMiddleware(0);
  };
}
