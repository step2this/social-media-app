/**
 * Profile Handler (Awilix Version)
 *
 * Demonstrates Awilix + Middy integration with method-based routing.
 * Handles both GET and PUT requests for user profile management.
 *
 * @route GET /auth/profile - Get user profile
 * @route PUT /auth/profile - Update user profile
 */

import { UpdateProfileWithHandleRequestSchema, type UpdateProfileWithHandleRequest } from '@social-media-app/shared'
import { createHandler } from '../../infrastructure/middleware/index.js'
import type { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda'

// Import module augmentation to access custom event properties
import type {} from '../../types/lambda-extended'

/**
 * GET handler implementation - services injected via Awilix
 */
const getProfileHandler: APIGatewayProxyHandlerV2 = async (event) => {
  // Services injected by Awilix middleware
  const { profileService } = event.services!

  // JWT middleware guarantees userId exists
  const userId = event.userId!

  // Get full profile
  const profile = await profileService.getProfileById(userId)

  if (!profile) {
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Profile not found'
      })
    }
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ profile })
  }
}

/**
 * PUT handler implementation - services injected via Awilix
 */
const updateProfileHandler: APIGatewayProxyHandlerV2 = async (event) => {
  // Services injected by Awilix middleware
  const { profileService } = event.services!

  // JWT middleware guarantees userId exists
  const userId = event.userId!

  // Type-safe access to validated input
  const updateData = event.validatedBody as UpdateProfileWithHandleRequest

  // Update profile
  const updatedProfile = await profileService.updateProfile(userId, updateData)

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ profile: updatedProfile })
  }
}

/**
 * Main handler that routes to appropriate function based on HTTP method
 */
const routingHandler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method

  switch (method) {
    case 'GET':
      return getProfileHandler(event)
    case 'PUT':
      return updateProfileHandler(event)
    default:
      return {
        statusCode: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Method not allowed',
          message: `HTTP method ${method} is not supported for this endpoint`
        })
      }
  }
}

/**
 * Export Middy-wrapped handler with Awilix service injection
 *
 * Note: Validation is applied conditionally based on method inside the handler
 * For PUT requests, we need validation; for GET requests, we don't
 */
export const handler = createHandler(routingHandler, {
  auth: true, // Requires JWT
  services: ['profileService'], // Awilix injects profileService
  validation: UpdateProfileWithHandleRequestSchema // Note: This will validate all requests, but GET ignores body
})
