import { describe, it, expect } from 'vitest'
import {
  isAugmentedLambdaEvent,
  assertAugmentedLambdaEvent,
  hasServices,
  hasUserId,
  hasValidatedBody
} from '../type-guards'
import type { APIGatewayProxyEventV2 } from 'aws-lambda'

describe('Type Guards', () => {
  describe('isAugmentedLambdaEvent', () => {
    it('should return true for any input (pure type assertion)', () => {
      expect(isAugmentedLambdaEvent({})).toBe(true)
      expect(isAugmentedLambdaEvent(null)).toBe(true)
      expect(isAugmentedLambdaEvent(undefined)).toBe(true)
      expect(isAugmentedLambdaEvent('invalid')).toBe(true)
    })

    it('should narrow type for TypeScript', () => {
      const testEvent: unknown = {
        requestContext: { http: { method: 'POST' } }
      }

      if (isAugmentedLambdaEvent(testEvent)) {
        // TypeScript should allow access to augmented properties without errors
        expect(testEvent.requestContext).toBeDefined()
        // These properties should exist due to type narrowing
        expect(testEvent.services).toBeUndefined() // Not set yet, but type exists
        expect(testEvent.userId).toBeUndefined() // Not set yet, but type exists
      }
    })
  })

  describe('assertAugmentedLambdaEvent', () => {
    it('should return the event if type guard passes', () => {
      const mockEvent = {
        requestContext: { http: { method: 'POST' } }
      }

      const result = assertAugmentedLambdaEvent(mockEvent, 'test')

      expect(result).toBe(mockEvent)
    })

    it('should not throw for valid events', () => {
      const mockEvent: Partial<APIGatewayProxyEventV2> = {
        requestContext: {} as any
      }

      expect(() => {
        assertAugmentedLambdaEvent(mockEvent, 'test')
      }).not.toThrow()
    })
  })

  describe('hasServices', () => {
    it('should return true when services object exists', () => {
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {} as any,
        services: {
          authService: {} as any
        }
      }

      expect(hasServices(event)).toBe(true)
    })

    it('should return false when services is undefined', () => {
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {} as any
      }

      expect(hasServices(event)).toBe(false)
    })

    it('should narrow type correctly', () => {
      const event: unknown = {
        requestContext: {} as any,
        services: {
          authService: {} as any
        }
      }

      if (hasServices(event)) {
        // TypeScript should know services is defined
        const _authService = event.services.authService
        expect(true).toBe(true) // Type check passed
      }
    })
  })

  describe('hasUserId', () => {
    it('should return true when userId exists', () => {
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {} as any,
        userId: 'user-123'
      }

      expect(hasUserId(event)).toBe(true)
    })

    it('should return false when userId is undefined', () => {
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {} as any
      }

      expect(hasUserId(event)).toBe(false)
    })
  })

  describe('hasValidatedBody', () => {
    it('should return true when validatedBody exists', () => {
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {} as any,
        validatedBody: { email: 'test@example.com' }
      }

      expect(hasValidatedBody(event)).toBe(true)
    })

    it('should return false when validatedBody is undefined', () => {
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {} as any
      }

      expect(hasValidatedBody(event)).toBe(false)
    })
  })
})
