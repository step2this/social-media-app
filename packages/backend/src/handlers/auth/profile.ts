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
import type { AugmentedLambdaHandler } from '../../types/lambda-extended.js'

/**
 * GET handler implementation - services injected via Awilix
 */
const getProfileHandler: AugmentedLambdaHandler = async (event) => {
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
const updateProfileHandler: AugmentedLambdaHandler = async (event) => {
  // Services injected by Awilix middleware
  const { profileService } = event.services!

  // JWT middleware guarantees userId exists
  const userId = event.userId!

  // Parse and validate body for PUT requests
  let updateData: UpdateProfileWithHandleRequest
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
    updateData = UpdateProfileWithHandleRequestSchema.parse(body)
  } catch (error) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Validation failed',
        details: error instanceof Error ? error.message : 'Invalid request body'
      })
    }
  }

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
const routingHandler: AugmentedLambdaHandler = async (event, context) => {
  const method = event.requestContext.http.method

  switch (method) {
    case 'GET':
      return getProfileHandler(event, context)
    case 'PUT':
      return updateProfileHandler(event, context)
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
 * Note: We don't apply validation middleware here because GET requests have no body
 * Validation is handled manually inside updateProfileHandler for PUT requests only
 */
export const handler = createHandler(routingHandler, {
  auth: true, // Requires JWT
  services: ['profileService'] // Awilix injects profileService
  // No validation middleware - handled manually per method
})
