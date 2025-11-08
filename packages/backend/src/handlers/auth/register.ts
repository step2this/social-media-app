/**
 * Register Handler (Middy Version)
 *
 * Migrated from custom middleware composition to Middy.
 * Creates new user accounts with email, username, and password.
 *
 * @route POST /auth/register
 */

import { RegisterRequestSchema, type RegisterRequest } from '@social-media-app/shared'
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
const registerHandler: APIGatewayProxyHandlerV2 = async (event) => {
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
 * Export Middy-wrapped handler with middleware stack
 */
export const handler = createHandler(registerHandler, {
  validation: RegisterRequestSchema
})
