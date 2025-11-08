/**
 * Login Handler (Middy Version)
 *
 * Migrated from custom middleware composition to Middy.
 * Authenticates users with email and password, returning JWT tokens.
 *
 * @route POST /auth/login
 */

import { LoginRequestSchema, type LoginRequest } from '@social-media-app/shared'
import { authService } from '../../utils/services.js'
import { createHandler } from '../../infrastructure/middleware-v2/index.js'
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'

/**
 * Handler implementation - pure business logic
 *
 * No middleware concerns - Middy handles:
 * - JSON parsing
 * - Validation
 * - Error handling
 * - Header normalization
 */
const loginHandler: APIGatewayProxyHandlerV2 = async (event) => {
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
 * Export Middy-wrapped handler with middleware stack
 */
export const handler = createHandler(loginHandler, {
  validation: LoginRequestSchema
})
