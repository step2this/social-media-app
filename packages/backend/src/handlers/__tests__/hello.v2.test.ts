/**
 * TDD Tests for Hello Handler (Middy Version)
 *
 * Behavioral tests ensuring the Middy migration maintains same functionality
 *
 * Principles:
 * - Test behavior, not implementation
 * - DRY with shared test utilities
 * - No mocks or spies - test actual handler behavior
 * - Compare with original handler to ensure parity
 */

import { describe, it, expect } from 'vitest'
import { handler } from '../hello.v2.js'
import type { HelloRequest } from '@social-media-app/shared'
import { createMockLambdaEvent } from '../../test/utils/test-factories.js'

describe('Hello Handler V2 (Middy) - Behavior Tests', () => {
  describe('Successful Greeting', () => {
    it('should return 200 with greeting for valid request', async () => {
      const request: HelloRequest = { name: 'Alice' }

      const event = createMockLambdaEvent({
        body: JSON.stringify(request)
      })

      const result = await handler(event, {} as any)

      expect(result.statusCode).toBe(200)

      const body = JSON.parse(result.body!)
      expect(body.message).toContain('Alice')
    })

    it('should include CORS headers in response', async () => {
      const request: HelloRequest = { name: 'Test' }

      const event = createMockLambdaEvent({
        body: JSON.stringify(request)
      })

      const result = await handler(event, {} as any)

      expect(result.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      })
    })
  })

  describe('Validation Errors', () => {
    it('should return 400 for invalid request body', async () => {
      const event = createMockLambdaEvent({
        body: JSON.stringify({ name: 123 }) // Invalid - name should be string
      })

      const result = await handler(event, {} as any)

      expect(result.statusCode).toBe(400)
    })

    it('should use default name when field is missing', async () => {
      const event = createMockLambdaEvent({
        body: JSON.stringify({}) // Missing name - should use default "World"
      })

      const result = await handler(event, {} as any)

      expect(result.statusCode).toBe(200)
      const body = JSON.parse(result.body!)
      expect(body.message).toContain('World')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string name', async () => {
      const event = createMockLambdaEvent({
        body: JSON.stringify({ name: '' })
      })

      const result = await handler(event, {} as any)

      // Should fail validation - name should not be empty
      expect(result.statusCode).toBe(400)
    })
  })
})
