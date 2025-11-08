/**
 * TypeScript module augmentation for AWS Lambda events
 *
 * Extends APIGatewayProxyEventV2 with properties added by our middleware:
 * - services: Awilix-injected services
 * - validatedBody: Zod-validated request body
 * - userId: JWT-authenticated user ID
 * - authPayload: Full JWT payload
 * - _awilixScope: Internal Awilix scope for cleanup
 */

import type { AwilixContainer } from 'awilix'
import type { JWTPayload } from '@social-media-app/auth-utils'
import type { ServiceContainer } from '../infrastructure/di/Container.js'

declare module 'aws-lambda' {
  interface APIGatewayProxyEventV2 {
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
}

// Export empty object to ensure this file is treated as a module
// This activates the module augmentation globally
export {}
