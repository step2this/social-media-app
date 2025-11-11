/**
 * Middy Middleware Exports and Handler Factory
 *
 * Provides a standardized way to create Lambda handlers with Middy middleware.
 * Follows SOLID principles:
 * - Single Responsibility: Each middleware has one job
 * - Open/Closed: Extensible via middleware composition
 * - Dependency Inversion: Handlers depend on middleware abstractions
 *
 * @module middleware-v2
 */

import middy from '@middy/core'
import httpErrorHandler from '@middy/http-error-handler'
import httpJsonBodyParser from '@middy/http-json-body-parser'
import httpHeaderNormalizer from '@middy/http-header-normalizer'
import type { z } from 'zod'

import { zodValidator } from './zodValidator.js'
import { jwtAuth } from './jwtAuth.js'
import { awilixMiddleware } from './awilixMiddleware.js'
import type { ServiceContainer } from '../di/Container.js'
import type { AugmentedLambdaHandler } from '../../types/lambda-extended.js'

/**
 * Handler configuration options
 */
export interface HandlerConfig {
  /**
   * Zod schema for request body validation
   * If provided, validates and attaches to event.validatedBody
   */
  readonly validation?: z.ZodSchema

  /**
   * Whether JWT authentication is required
   * - true: Requires valid JWT, throws 401 if missing/invalid
   * - false: Optional JWT, continues without error
   * - undefined: No JWT validation
   */
  readonly auth?: boolean

  /**
   * List of service names to inject via Awilix
   * If provided, services are resolved from container and attached to event.services
   *
   * @example ['authService', 'profileService']
   */
  readonly services?: Array<keyof ServiceContainer>
}

/**
 * Creates a standardized Lambda handler with Middy middleware
 *
 * Applies a consistent middleware stack:
 * 1. HTTP header normalization (case-insensitive headers)
 * 2. JSON body parsing
 * 3. JWT authentication (if enabled)
 * 4. Zod validation (if schema provided)
 * 5. Error handling (catches and formats errors)
 *
 * @param handler - The Lambda handler function
 * @param config - Handler configuration options
 * @returns Middy-wrapped handler with middleware applied
 *
 * @example
 * ```typescript
 * // With validation only
 * export const handler = createHandler(
 *   async (event) => {
 *     const { name } = event.validatedBody
 *     return { statusCode: 200, body: JSON.stringify({ message: `Hello ${name}` }) }
 *   },
 *   { validation: HelloRequestSchema }
 * )
 *
 * // With auth and validation
 * export const handler = createHandler(
 *   async (event) => {
 *     const userId = event.userId // From JWT
 *     const data = event.validatedBody
 *     return { statusCode: 200, body: JSON.stringify({ userId, data }) }
 *   },
 *   { auth: true, validation: LoginRequestSchema }
 * )
 * ```
 */
export function createHandler(
  handler: AugmentedLambdaHandler,
  config: HandlerConfig = {}
): middy.MiddyfiedHandler {
  const middleware = middy(handler)
    .use(httpHeaderNormalizer())
    // Configure body parser to handle GET requests gracefully (no body expected)
    .use(httpJsonBodyParser({
      disableContentTypeError: true // Don't fail if Content-Type is missing/invalid
    }))

  // Add JWT auth if enabled
  if (config.auth !== undefined) {
    middleware.use(jwtAuth({ required: config.auth }))
  }

  // Add Awilix service injection if requested
  if (config.services) {
    middleware.use(awilixMiddleware({ services: config.services }))
  }

  // Add validation if schema provided
  if (config.validation) {
    middleware.use(zodValidator(config.validation))
  }

  // Error handler should be last
  middleware.use(httpErrorHandler())

  return middleware
}

// Re-export individual middlewares for advanced use cases
export { zodValidator } from './zodValidator.js'
export { jwtAuth } from './jwtAuth.js'
export { awilixMiddleware, type AwilixMiddlewareOptions } from '../middleware/awilixMiddleware.js'
