/**
 * JWT Authentication Middleware for Middy
 *
 * Provides JWT token validation and user context injection.
 * Follows SOLID principles:
 * - Single Responsibility: Only handles JWT authentication
 * - Open/Closed: Extensible via configuration, closed for modification
 * - Dependency Inversion: Depends on abstractions (JWTConfig), not concrete implementations
 *
 * @module middleware/jwtAuth
 */

import type { MiddlewareObj } from '@middy/core'
import { verifyAccessToken, getJWTConfigFromEnv } from '../../utils/jwt.js'
import { isAugmentedLambdaEvent } from '../../types/type-guards.js'

/**
 * HTTP error with statusCode for Middy's error handler
 */
class HttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

/**
 * JWT authentication options
 */
interface JWTAuthOptions {
  /**
   * Whether authentication is required
   * - true: Throws 401 if token missing or invalid
   * - false: Continues without error if token missing or invalid
   */
  readonly required: boolean
}

/**
 * Creates a JWT authentication middleware for Middy
 *
 * Validates JWT from Authorization header and attaches user info to event.
 * Supports both required and optional authentication modes.
 *
 * @param options - Authentication options
 * @returns Middy middleware object
 *
 * @example
 * ```typescript
 * // Required authentication
 * const middleware = middy(handler)
 *   .use(jwtAuth({ required: true }))
 *
 * // Optional authentication
 * const middleware = middy(handler)
 *   .use(jwtAuth({ required: false }))
 * ```
 */
export function jwtAuth(
  options: JWTAuthOptions = { required: true }
): MiddlewareObj {
  const { required } = options

  return {
    before: async (request): Promise<void> => {
      // Type guard provides type-safe access to augmented properties
      if (!isAugmentedLambdaEvent(request.event)) {
        throw new Error('Invalid Lambda event type in jwtAuth')
      }

      const event = request.event

      const authHeader = event.headers?.authorization || event.headers?.Authorization

      if (!authHeader) {
        if (required) {
          throw new HttpError('Missing authorization header', 401)
        }
        return
      }

      const token = authHeader.replace(/^Bearer\s+/i, '')
      const jwtConfig = getJWTConfigFromEnv()

      try {
        const payload = await verifyAccessToken(token, jwtConfig.secret)

        if (!payload) {
          if (required) {
            throw new HttpError('Invalid token', 401)
          }
          return
        }

        // TypeScript knows these properties exist!
        event.userId = payload.userId
        event.authPayload = payload
      } catch (error) {
        if (required) {
          throw new HttpError(
            error instanceof Error ? error.message : 'Invalid token',
            401
          )
        }
      }
    }
  }
}
