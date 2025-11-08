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
import { isAugmentedLambdaEvent } from '../../types/type-guards.js'

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
      // Type guard provides type-safe access to augmented properties
      if (!isAugmentedLambdaEvent(request.event)) {
        throw new Error('Invalid Lambda event type in zodValidator')
      }

      const event = request.event

      // Parse body if it's a string, otherwise use as-is (already parsed by httpJsonBodyParser)
      const body = typeof event.body === 'string' && event.body
        ? JSON.parse(event.body)
        : (event.body || {})

      try {
        // TypeScript knows validatedBody exists!
        event.validatedBody = schema.parse(body)
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new HttpError(
            'Validation failed',
            400,
            error.errors
          )
        }
        throw error
      }
    }
  }
}
