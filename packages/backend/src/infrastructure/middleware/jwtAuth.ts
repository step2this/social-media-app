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

import type { MiddlewareObj, Request } from '@middy/core'
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { verifyAccessToken, getJWTConfigFromEnv } from '../../utils/jwt.js'

// Force TypeScript to process module augmentation
import type {} from '../../types/lambda-extended'

/**
 * Typed request with our augmented APIGatewayProxyEventV2
 * This includes all properties from lambda-extended.d.ts module augmentation
 */
type LambdaRequest = Request<APIGatewayProxyEventV2, APIGatewayProxyResultV2>

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
      // Cast event to access APIGatewayProxyEventV2 properties
      const event = request.event as any as import('aws-lambda').APIGatewayProxyEventV2

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
