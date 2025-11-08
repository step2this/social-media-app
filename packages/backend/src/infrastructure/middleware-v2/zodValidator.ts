/**
 * Zod Validation Middleware for Middy
 *
 * Provides type-safe request body validation using Zod schemas.
 * Follows SOLID principles:
 * - Single Responsibility: Only validates request bodies
 * - Open/Closed: Extensible via Zod schemas, closed for modification
 * - Dependency Inversion: Depends on abstractions (ZodSchema), not concrete types
 *
 * @module middleware-v2/zodValidator
 */

import type { MiddlewareObj } from '@middy/core'
import { z } from 'zod'

/**
 * Middy request object with typed extensions
 */
interface MiddyRequest {
  readonly event: {
    body?: string
    validatedBody?: unknown
    [key: string]: unknown
  }
  readonly context: unknown
  readonly response: unknown
  readonly error: unknown
  readonly internal: Record<string, unknown>
}

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
    before: async (request: MiddyRequest): Promise<void> => {
      // Parse body as JSON, default to empty object if not present
      const bodyText = request.event.body
      const body = bodyText ? JSON.parse(bodyText) : {}

      try {
        // Validate and parse with Zod schema
        const validated = schema.parse(body)

        // Attach validated data to event for handler access
        // Using type assertion to extend the event object
        ;(request.event as { validatedBody: T }).validatedBody = validated
      } catch (error) {
        // Convert Zod validation errors to HTTP errors
        if (error instanceof z.ZodError) {
          throw new HttpError('Validation failed', 400, error.errors)
        }

        // Re-throw unexpected errors
        throw error
      }
    }
  }
}
