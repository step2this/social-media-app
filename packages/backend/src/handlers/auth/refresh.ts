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
import type { AugmentedLambdaHandler } from '../../types/lambda-extended.js'

/**
 * Handler implementation - services injected via Awilix
 */
const refreshHandler: AugmentedLambdaHandler = async (event) => {
  const { authService } = event.services!
  const request = event.validatedBody as RefreshTokenRequest

  // Debug logging
  console.log('🔍 Refresh token request received:', {
    hasToken: !!request.refreshToken,
    tokenLength: request.refreshToken?.length,
    tokenPreview: request.refreshToken?.substring(0, 20) + '...'
  })

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

export const handler = createHandler(refreshHandler, {
  validation: RefreshTokenRequestSchema,
  services: ['authService']
})
