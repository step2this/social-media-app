/**
 * Zod Validation Middleware for Middy
 *
 * Provides type-safe request body validation using Zod schemas.
 * Follows SOLID principles:
 * - Single Responsibility: Only validates request bodies
 * - Open/Closed: Extensible via Zod schemas, closed for modification
 * - Dependency Inversion: Depends on abstractions (ZodSchema), not concrete types
 *
 * @module middleware/zodValidator
 */

import type { MiddlewareObj } from '@middy/core'
import { z } from 'zod'

// Force TypeScript to process module augmentation
import type {} from '../../types/lambda-extended'

/**
 * HTTP error with statusCode for Middy's error handler
 */
class HttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

/**
 * Creates a Zod validation middleware for Middy
 *
 * Validates request body against provided Zod schema and attaches
 * the parsed result to event.validatedBody
 *
 * @param schema - Zod schema to validate against
 * @returns Middy middleware object
 *
 * @example
 * ```typescript
 * const LoginSchema = z.object({
 *   email: z.string().email(),
 *   password: z.string().min(8)
 * })
 *
 * const middleware = middy(handler)
 *   .use(zodValidator(LoginSchema))
 * ```
 */
export function zodValidator<T>(
  schema: z.ZodSchema<T>
): MiddlewareObj {
  return {
    before: async (request): Promise<void> => {
      // Cast event to APIGatewayProxyEventV2 to access augmented properties
      const event = request.event as import('aws-lambda').APIGatewayProxyEventV2

      // Parse body if it's a string, otherwise use as-is (already parsed by httpJsonBodyParser)
      const body = typeof event.body === 'string' && event.body ? JSON.parse(event.body) : (event.body || {})

      try {
        event.validatedBody = schema.parse(body)
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(JSON.stringify({
            statusCode: 400,
            message: 'Validation failed',
            errors: error.errors
          }))
        }
        throw error
      }
    }
  }
}
