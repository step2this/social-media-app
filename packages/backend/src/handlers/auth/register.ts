/**
 * Register Handler (Awilix Version)
 *
 * Demonstrates Awilix + Middy integration.
 * Services are injected automatically via middleware.
 * Creates new user accounts with email, username, and password.
 *
 * @route POST /auth/register
 */

import { RegisterRequestSchema, type RegisterRequest } from '@social-media-app/shared'
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
 */
const registerHandler: AugmentedLambdaHandler = async (event) => {
  // Services injected by Awilix middleware
  const { authService } = event.services!

  // Type-safe access to validated input
  const request = event.validatedBody as RegisterRequest

  // Business logic only - delegate to authService
  const response = await authService.register(request)

  return {
    statusCode: 201,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(response)
  }
}

/**
 * Export Middy-wrapped handler with Awilix service injection
 */
export const handler = createHandler(registerHandler, {
  validation: RegisterRequestSchema,
  services: ['authService'] // ← Awilix injects authService
})
