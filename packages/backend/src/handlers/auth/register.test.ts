/**
 * TDD Tests for Register Handler (Middy Version)
 *
 * Behavioral tests ensuring Middy migration maintains functionality.
 *
 * Principles:
 * - Test behavior, not implementation
 * - DRY with shared test utilities
 * - No mocks - test actual handler behavior with real authService
 * - Edge-first testing (failures before success)
 */

import { describe, it, expect } from 'vitest'
import { handler } from './register.js'
import type { RegisterRequest } from '@social-media-app/shared'
import { createMockLambdaEvent } from '../../test/utils/test-factories.js'

/**
 * DRY Helper: Create unique register request to avoid conflicts
 */
function createUniqueRegisterRequest(): RegisterRequest {
  const timestamp = Date.now()
  return {
    email: `test-${timestamp}@example.com`,
    password: 'ValidPass123!',
    username: `testuser${timestamp}`
  }
}

describe('Register Handler V2 (Middy) - Behavior Tests', () => {
  describe('Validation Errors', () => {
    it('should return 400 for invalid email format', async () => {
      const invalidRequest = {
        email: 'not-an-email',
        password: 'ValidPass123!',
        username: 'testuser'
      }

      const event = createMockLambdaEvent({
        body: JSON.stringify(invalidRequest)
      })

      const result = await handler(event, {} as any)

      expect(result.statusCode).toBe(400)
    })

    it('should return 400 for weak password', async () => {
      const invalidRequest = {
        email: 'test@example.com',
        password: 'weak', // No uppercase, no special char, too short
        username: 'testuser'
      }

      const event = createMockLambdaEvent({
        body: JSON.stringify(invalidRequest)
      })

      const result = await handler(event, {} as any)

      expect(result.statusCode).toBe(400)
    })

    it('should return 400 for missing required fields', async () => {
      const event = createMockLambdaEvent({
        body: JSON.stringify({}) // Empty body
      })

      const result = await handler(event, {} as any)

      expect(result.statusCode).toBe(400)
    })

    it('should return 400 for invalid username (too short)', async () => {
      const invalidRequest = {
        email: 'test@example.com',
        password: 'ValidPass123!',
        username: 'ab' // Too short (min 3)
      }

      const event = createMockLambdaEvent({
        body: JSON.stringify(invalidRequest)
      })

      const result = await handler(event, {} as any)

      expect(result.statusCode).toBe(400)
    })
  })

  describe('Successful Registration', () => {
    it('should return 201 with user and tokens for valid request', async () => {
      const validRequest = createUniqueRegisterRequest()

      const event = createMockLambdaEvent({
        body: JSON.stringify(validRequest)
      })

      const result = await handler(event, {} as any)

      expect(result.statusCode).toBe(201)

      const body = JSON.parse(result.body!)
      expect(body).toHaveProperty('user')
      expect(body.user).toHaveProperty('id')
      expect(body.user.email).toBe(validRequest.email)
      expect(body.user.username).toBe(validRequest.username)

      expect(body).toHaveProperty('tokens')
      expect(body.tokens).toHaveProperty('accessToken')
      expect(body.tokens).toHaveProperty('refreshToken')
      expect(body.tokens).toHaveProperty('expiresIn')
    })

    it('should include CORS headers in response', async () => {
      const validRequest = createUniqueRegisterRequest()

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

  describe('Conflict Errors', () => {
    it('should return 409 when email already exists', async () => {
      const request = createUniqueRegisterRequest()

      // First registration - should succeed
      const event1 = createMockLambdaEvent({
        body: JSON.stringify(request)
      })
      const result1 = await handler(event1, {} as any)
      expect(result1.statusCode).toBe(201)

      // Second registration with same email - should fail
      const request2 = {
        ...request,
        username: `different${Date.now()}` // Different username, same email
      }
      const event2 = createMockLambdaEvent({
        body: JSON.stringify(request2)
      })
      const result2 = await handler(event2, {} as any)

      expect(result2.statusCode).toBe(409)
      const body = JSON.parse(result2.body!)
      expect(body.error).toContain('Email already registered')
    })

    it('should return 409 when username already exists', async () => {
      const request1 = createUniqueRegisterRequest()

      // First registration - should succeed
      const event1 = createMockLambdaEvent({
        body: JSON.stringify(request1)
      })
      const result1 = await handler(event1, {} as any)
      expect(result1.statusCode).toBe(201)

      // Second registration with same username - should fail
      const request2: RegisterRequest = {
        email: `different-${Date.now()}@example.com`, // Different email
        password: 'ValidPass123!',
        username: request1.username // Same username
      }
      const event2 = createMockLambdaEvent({
        body: JSON.stringify(request2)
      })
      const result2 = await handler(event2, {} as any)

      expect(result2.statusCode).toBe(409)
      const body = JSON.parse(result2.body!)
      expect(body.error).toContain('Username already taken')
    })
  })

  describe('Edge Cases', () => {
    it('should reject empty string email', async () => {
      const invalidRequest = {
        email: '',
        password: 'ValidPass123!',
        username: 'testuser'
      }

      const event = createMockLambdaEvent({
        body: JSON.stringify(invalidRequest)
      })

      const result = await handler(event, {} as any)
      expect(result.statusCode).toBe(400)
    })

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
