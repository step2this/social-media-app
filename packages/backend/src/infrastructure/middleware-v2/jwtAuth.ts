/**
 * JWT Authentication Middleware for Middy
 *
 * Provides JWT token validation and user context injection.
 * Follows SOLID principles:
 * - Single Responsibility: Only handles JWT authentication
 * - Open/Closed: Extensible via configuration, closed for modification
 * - Dependency Inversion: Depends on abstractions (JWTConfig), not concrete implementations
 *
 * @module middleware-v2/jwtAuth
 */

import type { MiddlewareObj } from '@middy/core'
import { verifyAccessToken, getJWTConfigFromEnv } from '../../utils/jwt.js'

/**
 * JWT payload structure
 */
interface JWTPayload {
  readonly userId: string
  readonly email: string
  readonly iat: number
  readonly exp: number
}

/**
 * Middy request object with typed extensions
 */
interface MiddyRequest {
  readonly event: {
    headers?: Record<string, string>
    userId?: string
    authPayload?: JWTPayload
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
    before: async (request: MiddyRequest): Promise<void> => {
      // Extract Authorization header (case-insensitive)
      const authHeader =
        request.event.headers?.authorization ||
        request.event.headers?.Authorization

      // No auth header provided
      if (!authHeader) {
        if (required) {
          throw new HttpError('Missing authorization header', 401)
        }
        // Optional auth - continue without user context
        return
      }

      // Extract token from "Bearer <token>" format
      // Also handles cases where "Bearer" prefix is missing
      const token = authHeader.replace(/^Bearer\s+/i, '')

      // Get JWT configuration from environment
      const jwtConfig = getJWTConfigFromEnv()

      try {
        // Verify and decode JWT
        const payload = await verifyAccessToken(token, jwtConfig.secret)

        // Token verification failed
        if (!payload) {
          if (required) {
            throw new HttpError('Invalid token', 401)
          }
          // Optional auth - continue without user context
          return
        }

        // Attach user info to event for handler access
        // Using type assertion to extend the event object
        ;(request.event as { userId: string; authPayload: JWTPayload }).userId = payload.userId
        ;(request.event as { userId: string; authPayload: JWTPayload }).authPayload = payload

      } catch (error) {
        // Token validation failed
        if (required) {
          const message = error instanceof Error ? error.message : 'Invalid token'
          throw new HttpError(message, 401)
        }

        // Optional auth - continue without user context
        return
      }
    }
  }
}
