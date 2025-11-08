/**
 * TDD Tests for Refresh Token Handler (Middy Version)
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
import { handler } from '../auth/refresh.v2.js'
import type { RefreshTokenRequest, RegisterRequest } from '@social-media-app/shared'
import { createMockLambdaEvent } from '../../test/utils/test-factories.js'
import { authService } from '../../utils/services.js'

/**
 * Setup: Create test user and get valid refresh token
 */
async function createTestUserWithTokens(): Promise<{ refreshToken: string }> {
  const timestamp = Date.now()

  // Register a new user
  const registerRequest: RegisterRequest = {
    email: `refresh-test-${timestamp}@example.com`,
    password: 'TestPass123!',
    username: `refreshtest${timestamp}`
  }

  await authService.register(registerRequest)

  // Login to get tokens
  const loginResponse = await authService.login({
    email: registerRequest.email,
    password: registerRequest.password
  })

  return {
    refreshToken: loginResponse.tokens.refreshToken
  }
}

describe('Refresh Token Handler V2 (Middy) - Behavior Tests', () => {
  describe('Validation Errors', () => {
    it('should return 400 for missing refresh token', async () => {
      const invalidRequest = {}

      const event = createMockLambdaEvent({
        body: JSON.stringify(invalidRequest)
      })

      const result = await handler(event, {} as any)

      expect(result.statusCode).toBe(400)
    })

    it('should return 400 for empty refresh token', async () => {
      const invalidRequest = {
        refreshToken: ''
      }

      const event = createMockLambdaEvent({
        body: JSON.stringify(invalidRequest)
      })

      const result = await handler(event, {} as any)

      expect(result.statusCode).toBe(400)
    })
  })

  describe('Successful Token Refresh', () => {
    let testTokens: { refreshToken: string }

    beforeEach(async () => {
      // Create a test user and get valid tokens
      testTokens = await createTestUserWithTokens()
    })

    it('should return 200 with new tokens for valid refresh token', async () => {
      const validRequest: RefreshTokenRequest = {
        refreshToken: testTokens.refreshToken
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
      expect(body.tokens).toHaveProperty('expiresIn')

      // New tokens should be different from old ones
      expect(body.tokens.refreshToken).not.toBe(testTokens.refreshToken)
    })

    it('should include CORS headers in response', async () => {
      const validRequest: RefreshTokenRequest = {
        refreshToken: testTokens.refreshToken
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
    it('should return 401 for invalid refresh token', async () => {
      const invalidRequest: RefreshTokenRequest = {
        refreshToken: 'invalid-token-12345'
      }

      const event = createMockLambdaEvent({
        body: JSON.stringify(invalidRequest)
      })

      const result = await handler(event, {} as any)

      expect(result.statusCode).toBe(401)
    })

    it('should return 401 for non-existent refresh token', async () => {
      const invalidRequest: RefreshTokenRequest = {
        refreshToken: 'nonexistent-token-67890-abc'
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

    it('should not allow reuse of already-refreshed token', async () => {
      const testTokens = await createTestUserWithTokens()

      // First refresh - should succeed
      const firstRequest: RefreshTokenRequest = {
        refreshToken: testTokens.refreshToken
      }

      const firstEvent = createMockLambdaEvent({
        body: JSON.stringify(firstRequest)
      })

      const firstResult = await handler(firstEvent, {} as any)
      expect(firstResult.statusCode).toBe(200)

      // Second refresh with same token - should fail
      const secondEvent = createMockLambdaEvent({
        body: JSON.stringify(firstRequest)
      })

      const secondResult = await handler(secondEvent, {} as any)

      // Token should be invalidated after first use
      expect(secondResult.statusCode).toBe(401)
    })
  })
})
