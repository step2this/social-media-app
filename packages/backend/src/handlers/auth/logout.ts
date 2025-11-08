/**
 * Logout Handler (Awilix Version)
 *
 * Demonstrates Awilix + Middy integration.
 * Invalidates user's refresh token to log them out. Logout is idempotent - always succeeds.
 *
 * @route POST /auth/logout
 */

import { LogoutRequestSchema, type LogoutRequest } from '@social-media-app/shared'
import { createHandler } from '../../infrastructure/middleware/index.js'
import type { AugmentedLambdaHandler } from '../../types/lambda-extended.js'

/**
 * Handler implementation - services injected via Awilix
 *
 * No middleware concerns - Middy handles:
 * - JSON parsing
 * - Validation
 * - Error handling
 * - Header normalization
 * - Service injection (Awilix)
 * - JWT authentication
 */
const logoutHandler: AugmentedLambdaHandler = async (event) => {
  // Services injected by Awilix middleware
  const { authService } = event.services!

  // Type-safe access to validated input
  const request = event.validatedBody as LogoutRequest

  // JWT middleware guarantees userId exists
  const userId = event.userId!

  try {
    // Business logic - invalidate refresh token
    await authService.logout(request.refreshToken, userId)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Logged out successfully'
      })
    }
  } catch (error) {
    // Log warning but always return success (idempotent operation)
    console.warn('[LOGOUT_ERROR]', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Logged out successfully'
      })
    }
  }
}

/**
 * Export Middy-wrapped handler with Awilix service injection
 */
export const handler = createHandler(logoutHandler, {
  auth: true, // Requires JWT
  validation: LogoutRequestSchema,
  services: ['authService'] // ← Awilix injects authService
})
