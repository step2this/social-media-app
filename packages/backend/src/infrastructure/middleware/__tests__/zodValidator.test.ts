/**
 * TDD: Zod Validation Middleware for Middy
 *
 * Testing behavior: validation middleware should parse and validate request bodies
 *
 * Principles:
 * - Test behavior, not implementation
 * - Use dependency inversion (pass Zod schema as parameter)
 * - No mocks or spies - test actual validation behavior
 * - Type-safe throughout
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import type { MiddlewareObj } from '@middy/core'
import { createMockLambdaEvent } from '../../../test/utils/test-factories.js'

// Test schema
const TestSchema = z.object({
  name: z.string().min(1),
  age: z.number().positive().optional()
})

type TestRequest = z.infer<typeof TestSchema>

/**
 * Zod validator middleware - to be implemented
 */
interface ZodValidatorMiddleware extends MiddlewareObj {
  before: (request: { event: any; context: any; response: any; error: any; internal: any }) => Promise<void>
}

/**
 * Factory function signature we'll implement
 */
type ZodValidatorFactory = <T>(schema: z.ZodSchema<T>) => ZodValidatorMiddleware

describe('zodValidator Middleware - TDD', () => {
  describe('Valid Input', () => {
    it('should parse valid request body and attach to event.validatedBody', async () => {
      // Import will fail initially - that's expected in TDD
      const { zodValidator } = await import('../zodValidator.js')

      const middleware = zodValidator(TestSchema)

      const event = createMockLambdaEvent({
        body: JSON.stringify({ name: 'Alice', age: 30 })
      })

      const request = {
        event,
        context: {},
        response: {},
        error: undefined,
        internal: {}
      }

      await middleware.before!(request)

      // Behavior: Validated data attached to event
      expect(request.event.validatedBody).toEqual({ name: 'Alice', age: 30 })
    })

    it('should handle optional fields correctly', async () => {
      const { zodValidator } = await import('../zodValidator.js')

      const middleware = zodValidator(TestSchema)

      const event = createMockLambdaEvent({
        body: JSON.stringify({ name: 'Bob' }) // age is optional
      })

      const request = {
        event,
        context: {},
        response: {},
        error: undefined,
        internal: {}
      }

      await middleware.before!(request)

      expect(request.event.validatedBody).toEqual({ name: 'Bob' })
    })
  })

  describe('Invalid Input', () => {
    it('should throw error with 400 status for invalid data', async () => {
      const { zodValidator } = await import('../zodValidator.js')

      const middleware = zodValidator(TestSchema)

      const event = createMockLambdaEvent({
        body: JSON.stringify({ name: 123 }) // Invalid - should be string
      })

      const request = {
        event,
        context: {},
        response: {},
        error: undefined,
        internal: {}
      }

      // Behavior: Should throw error that Middy's error handler will catch
      await expect(middleware.before!(request)).rejects.toThrow()

      try {
        await middleware.before!(request)
      } catch (error: unknown) {
        // Error should have statusCode property for Middy error handler
        expect((error as { statusCode?: number }).statusCode).toBe(400)
      }
    })

    it('should include validation details in error', async () => {
      const { zodValidator } = await import('../zodValidator.js')

      const middleware = zodValidator(TestSchema)

      const event = createMockLambdaEvent({
        body: JSON.stringify({ age: -5 }) // Missing name, age is negative
      })

      const request = {
        event,
        context: {},
        response: {},
        error: undefined,
        internal: {}
      }

      try {
        await middleware.before!(request)
        expect.fail('Should have thrown validation error')
      } catch (error: unknown) {
        const err = error as { details?: unknown[] }
        expect(err.details).toBeDefined()
        expect(Array.isArray(err.details)).toBe(true)
      }
    })
  })

  describe('Empty or Malformed Body', () => {
    it('should handle empty body as empty object', async () => {
      const { zodValidator } = await import('../zodValidator.js')

      // Schema that accepts empty object
      const EmptySchema = z.object({}).passthrough()
      const middleware = zodValidator(EmptySchema)

      const event = createMockLambdaEvent({
        body: undefined
      })

      const request = {
        event,
        context: {},
        response: {},
        error: undefined,
        internal: {}
      }

      await middleware.before!(request)

      expect(request.event.validatedBody).toEqual({})
    })
  })
})
