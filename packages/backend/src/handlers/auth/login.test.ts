/**
 * TDD Tests for Login Handler (Middy Version)
 *
 * Behavioral tests ensuring Middy migration maintains functionality.
 *
 * Principles:
 * - Test behavior, not implementation
 * - DRY with shared test utilities
 * - No mocks - test actual handler behavior with real authService
 * - Edge-first testing (failures before success)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { handler } from './login.js'
import type { LoginRequest, RegisterRequest } from '@social-media-app/shared'
import { createMockLambdaEvent } from '../../test/utils/test-factories.js'
import { authService } from '../../utils/services.js'

/**
 * Setup: Create a test user before login tests
 * This ensures we have valid credentials to test against
 */
async function createTestUser(): Promise<{ email: string; password: string }> {
  const timestamp = Date.now()
  const credentials = {
    email: `login-test-${timestamp}@example.com`,
    password: 'TestPass123!',
    username: `logintest${timestamp}`
  }

  const registerRequest: RegisterRequest = {
    email: credentials.email,
    password: credentials.password,
    username: credentials.username
  }

  await authService.register(registerRequest)

  return {
    email: credentials.email,
    password: credentials.password
  }
}

describe('Login Handler V2 (Middy) - Behavior Tests', () => {
  describe('Validation Errors', () => {
    it('should return 400 for invalid email format', async () => {
      const invalidRequest = {
        email: 'not-an-email',
        password: 'ValidPass123!'
      }

      const event = createMockLambdaEvent({
        body: JSON.stringify(invalidRequest)
      })

      const result = await handler(event, {} as any)

      expect(result.statusCode).toBe(400)
    })

    it('should return 400 for missing email', async () => {
      const invalidRequest = {
        password: 'ValidPass123!'
      }

      const event = createMockLambdaEvent({
        body: JSON.stringify(invalidRequest)
      })

      const result = await handler(event, {} as any)

      expect(result.statusCode).toBe(400)
    })

    it('should return 400 for missing password', async () => {
      const invalidRequest = {
        email: 'test@example.com'
      }

      const event = createMockLambdaEvent({
        body: JSON.stringify(invalidRequest)
      })

      const result = await handler(event, {} as any)

      expect(result.statusCode).toBe(400)
    })

    it('should return 400 for empty email', async () => {
      const invalidRequest = {
        email: '',
        password: 'ValidPass123!'
      }

      const event = createMockLambdaEvent({
        body: JSON.stringify(invalidRequest)
      })

      const result = await handler(event, {} as any)

      expect(result.statusCode).toBe(400)
    })
  })

  describe('Successful Login', () => {
    let testCredentials: { email: string; password: string }

    beforeEach(async () => {
      // Create a test user for login tests
      testCredentials = await createTestUser()
    })

    it('should return 200 with tokens for valid credentials', async () => {
      const validRequest: LoginRequest = {
        email: testCredentials.email,
        password: testCredentials.password
      }

      const event = createMockLambdaEvent({
        body: JSON.stringify(validRequest)
      })

      const result = await handler(event, {} as any)

      expect(result.statusCode).toBe(200)

      const body = JSON.parse(result.body!)
      expect(body).toHaveProperty('tokens')
      expect(body.tokens).toHaveProperty('accessToken')
      expect(body.tokens).toHaveProperty('refreshToken')
    })

    it('should include CORS headers in response', async () => {
      const validRequest: LoginRequest = {
        email: testCredentials.email,
        password: testCredentials.password
      }

      const event = createMockLambdaEvent({
        body: JSON.stringify(validRequest)
      })

      const result = await handler(event, {} as any)

      expect(result.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      })
    })
  })

  describe('Authentication Errors', () => {
    it('should return 401 for non-existent user', async () => {
      const invalidRequest: LoginRequest = {
        email: 'nonexistent@example.com',
        password: 'SomePassword123!'
      }

      const event = createMockLambdaEvent({
        body: JSON.stringify(invalidRequest)
      })

      const result = await handler(event, {} as any)

      expect(result.statusCode).toBe(401)
    })

    it('should return 401 for incorrect password', async () => {
      const testCredentials = await createTestUser()

      const invalidRequest: LoginRequest = {
        email: testCredentials.email,
        password: 'WrongPassword123!'
      }

      const event = createMockLambdaEvent({
        body: JSON.stringify(invalidRequest)
      })

      const result = await handler(event, {} as any)

      expect(result.statusCode).toBe(401)
    })
  })

  describe('Edge Cases', () => {
    it('should reject malformed JSON', async () => {
      const event = createMockLambdaEvent({
        body: 'not valid json{{'
      })

      const result = await handler(event, {} as any)

      // Middy's httpJsonBodyParser returns 415 (Unsupported Media Type) for malformed JSON
      expect(result.statusCode).toBe(415)
    })
  })
})
