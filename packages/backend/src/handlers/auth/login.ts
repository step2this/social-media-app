/**
 * Login Handler (Awilix Version)
 *
 * Demonstrates Awilix + Middy integration.
 * Authenticates users with email and password, returning JWT tokens.
 *
 * @route POST /auth/login
 */

import { LoginRequestSchema, type LoginRequest } from '@social-media-app/shared'
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
const loginHandler: AugmentedLambdaHandler = async (event) => {
  // Services injected by Awilix middleware
  const { authService } = event.services!

  // Type-safe access to validated input
  const request = event.validatedBody as LoginRequest

  // Business logic only - delegate to authService
  const response = await authService.login(request)

  return {
    statusCode: 200,
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
export const handler = createHandler(loginHandler, {
  validation: LoginRequestSchema,
  services: ['authService'] // ← Awilix injects authService
})
