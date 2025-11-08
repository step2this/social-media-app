/**
 * Refresh Token Handler (Awilix Version)
 *
 * Demonstrates Awilix + Middy integration.
 * Validates and refreshes JWT tokens using a refresh token.
 *
 * @route POST /auth/refresh
 */

import { RefreshTokenRequestSchema, type RefreshTokenRequest } from '@social-media-app/shared'
import { createHandler } from '../../infrastructure/middleware/index.js'
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'

// Import module augmentation to access custom event properties
import type {} from '../../types/lambda-extended'

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
const refreshHandler: APIGatewayProxyHandlerV2 = async (event) => {
  // Services injected by Awilix middleware
  const { authService } = event.services!

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
 * Export Middy-wrapped handler with Awilix service injection
 */
export const handler = createHandler(refreshHandler, {
  validation: RefreshTokenRequestSchema,
  services: ['authService'] // ← Awilix injects authService
})
