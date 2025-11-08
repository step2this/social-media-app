/**
 * Refresh Token Handler (Middy Version)
 *
 * Migrated from custom middleware composition to Middy.
 * Validates and refreshes JWT tokens using a refresh token.
 *
 * @route POST /auth/refresh
 */

import { RefreshTokenRequestSchema, type RefreshTokenRequest } from '@social-media-app/shared'
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
const refreshHandler: APIGatewayProxyHandlerV2 = async (event) => {
  // Type-safe access to validated input
  const request = event.validatedBody as RefreshTokenRequest

  // Business logic only - delegate to authService
  const response = await authService.refreshToken(request)

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
export const handler = createHandler(refreshHandler, {
  validation: RefreshTokenRequestSchema
})
