/**
 * TDD: JWT Authentication Middleware for Middy
 *
 * Testing behavior: auth middleware should validate JWTs and attach user info
 *
 * Principles:
 * - Test behavior, not implementation
 * - DRY: Extract common test setup into helpers
 * - No spies - test actual JWT validation
 * - Type-safe throughout
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockLambdaEvent } from '../../../test/utils/test-factories.js'
import { generateAccessToken } from '../../../utils/jwt.js'

/**
 * JWT configuration interface for dependency inversion
 */
interface JWTConfig {
  readonly secret: string
  readonly accessTokenExpiry: number
}

/**
 * Test JWT config
 */
const testJWTConfig: JWTConfig = {
  secret: 'test-secret-key-for-testing-only-do-not-use-in-production',
  accessTokenExpiry: 900
}

/**
 * DRY Helper: Generate valid test token
 */
async function generateTestToken(userId: string, email: string): Promise<string> {
  const originalSecret = process.env.JWT_SECRET
  const originalExpiry = process.env.JWT_ACCESS_TOKEN_EXPIRY

  process.env.JWT_SECRET = testJWTConfig.secret
  process.env.JWT_ACCESS_TOKEN_EXPIRY = testJWTConfig.accessTokenExpiry.toString()

  const token = await generateAccessToken({ userId, email })

  process.env.JWT_SECRET = originalSecret
  process.env.JWT_ACCESS_TOKEN_EXPIRY = originalExpiry

  return token
}

/**
 * DRY Helper: Create a Middy request object
 */
function createMiddyRequest(headers: Record<string, string> = {}) {
  return {
    event: createMockLambdaEvent({ headers }),
    context: {},
    response: {},
    error: undefined,
    internal: {}
  }
}

/**
 * DRY Helper: Execute middleware and return the event
 */
async function executeMiddleware(
  middleware: { before?: (request: any) => Promise<void> },
  headers: Record<string, string> = {}
) {
  const request = createMiddyRequest(headers)
  await middleware.before!(request)
  return request.event
}

/**
 * DRY Helper: Expect middleware to throw with specific status code
 */
async function expectMiddlewareToThrow(
  middleware: { before?: (request: any) => Promise<void> },
  headers: Record<string, string>,
  expectedStatusCode: number,
  expectedMessagePart?: string
): Promise<Error> {
  const request = createMiddyRequest(headers)

  try {
    await middleware.before!(request)
    throw new Error('Expected middleware to throw, but it did not')
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string }
    expect(err.statusCode).toBe(expectedStatusCode)
    if (expectedMessagePart) {
      expect(err.message).toContain(expectedMessagePart)
    }
    return err as Error
  }
}

describe('jwtAuth Middleware - TDD', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = testJWTConfig.secret
    process.env.JWT_ACCESS_TOKEN_EXPIRY = testJWTConfig.accessTokenExpiry.toString()
  })

  describe('Valid Token', () => {
    it('should extract and verify JWT from Authorization header', async () => {
      const { jwtAuth } = await import('../jwtAuth.js')
      const middleware = jwtAuth({ required: true })
      const token = await generateTestToken('user-123', 'test@example.com')

      const event = await executeMiddleware(middleware, {
        authorization: `Bearer ${token}`
      })

      expect(event.userId).toBe('user-123')
      expect(event.authPayload).toBeDefined()
      expect(event.authPayload.email).toBe('test@example.com')
    })

    it('should handle case-insensitive Authorization header', async () => {
      const { jwtAuth } = await import('../jwtAuth.js')
      const middleware = jwtAuth({ required: true })
      const token = await generateTestToken('user-456', 'alice@example.com')

      const event = await executeMiddleware(middleware, {
        Authorization: `Bearer ${token}` // Capital A
      })

      expect(event.userId).toBe('user-456')
    })
  })

  describe('Missing Token (Required Mode)', () => {
    it('should throw 401 error when token is missing and required', async () => {
      const { jwtAuth } = await import('../jwtAuth.js')
      const middleware = jwtAuth({ required: true })

      await expectMiddlewareToThrow(
        middleware,
        {}, // No Authorization header
        401,
        'authorization'
      )
    })
  })

  describe('Missing Token (Optional Mode)', () => {
    it('should allow request to proceed when token is missing and not required', async () => {
      const { jwtAuth } = await import('../jwtAuth.js')
      const middleware = jwtAuth({ required: false })

      const event = await executeMiddleware(middleware, {})

      expect(event.userId).toBeUndefined()
    })
  })

  describe('Invalid Token', () => {
    it('should throw 401 for malformed token', async () => {
      const { jwtAuth } = await import('../jwtAuth.js')
      const middleware = jwtAuth({ required: true })

      await expectMiddlewareToThrow(
        middleware,
        { authorization: 'Bearer invalid-token-here' },
        401
      )
    })

    it('should allow invalid token when not required', async () => {
      const { jwtAuth } = await import('../jwtAuth.js')
      const middleware = jwtAuth({ required: false })

      const event = await executeMiddleware(middleware, {
        authorization: 'Bearer invalid-token'
      })

      expect(event.userId).toBeUndefined()
    })
  })

  describe('Token Without Bearer Prefix', () => {
    it('should extract token even without Bearer prefix', async () => {
      const { jwtAuth } = await import('../jwtAuth.js')
      const middleware = jwtAuth({ required: true })
      const token = await generateTestToken('user-789', 'bob@example.com')

      const event = await executeMiddleware(middleware, {
        authorization: token // No "Bearer" prefix
      })

      expect(event.userId).toBe('user-789')
    })
  })
})
