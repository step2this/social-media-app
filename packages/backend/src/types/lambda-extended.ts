/**
 * Extended Lambda Event Types
 *
 * Provides augmented APIGatewayProxyEventV2 with middleware-added properties.
 * This file uses explicit type extension instead of module augmentation
 * for better TypeScript compatibility and IDE support.
 *
 * @module types/lambda-extended
 */

import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import type { AwilixContainer } from 'awilix'
import type { JWTPayload } from '@social-media-app/auth-utils'
import type { ServiceContainer } from '../infrastructure/di/Container.js'

/**
 * Augmented Lambda Event with middleware properties
 * 
 * Extends the base APIGatewayProxyEventV2 with properties added by our middleware:
 * - services: Awilix-injected services
 * - validatedBody: Zod-validated request body
 * - userId: JWT-authenticated user ID
 * - authPayload: Full JWT payload
 * - _awilixScope: Internal Awilix scope for cleanup
 */
export interface AugmentedLambdaEvent extends APIGatewayProxyEventV2 {
  /**
   * Services injected by Awilix middleware
   * Available when handler uses `services` option in createHandler
   */
  services?: ServiceContainer

  /**
   * Validated request body
   * Available when handler uses `validation` option in createHandler
   */
  validatedBody?: unknown

  /**
   * Authenticated user ID from JWT
   * Available when handler uses `auth: true` option in createHandler
   */
  userId?: string

  /**
   * Full JWT payload
   * Available when handler uses `auth: true` option in createHandler
   */
  authPayload?: JWTPayload

  /**
   * Internal: Awilix scope for cleanup
   * Used internally by awilixMiddleware
   * @internal
   */
  _awilixScope?: AwilixContainer<ServiceContainer>
}

/**
 * Augmented Lambda Handler type
 * 
 * Use this instead of APIGatewayProxyHandlerV2 to get access to augmented properties
 */
export type AugmentedLambdaHandler = (
  event: AugmentedLambdaEvent,
  context: import('aws-lambda').Context
) => Promise<import('aws-lambda').APIGatewayProxyResultV2>
