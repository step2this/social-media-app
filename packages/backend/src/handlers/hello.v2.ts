/**
 * Hello Handler (Middy Version)
 *
 * Migrated from custom middleware composition to Middy.
 * Demonstrates clean handler pattern with dependency inversion.
 *
 * @route POST /hello
 */

import { HelloRequestSchema, type HelloRequest } from '@social-media-app/shared'
import { helloService } from '@social-media-app/dal'
import { createHandler } from '../infrastructure/middleware-v2/index.js'
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
const helloHandler: APIGatewayProxyHandlerV2 = async (event) => {
  // Type-safe access to validated input
  const request = event.validatedBody as HelloRequest

  // Business logic only - generate greeting
  const response = helloService.generateHelloResponse(request)

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
export const handler = createHandler(helloHandler, {
  validation: HelloRequestSchema
})
