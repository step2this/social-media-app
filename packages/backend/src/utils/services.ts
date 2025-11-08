/**
 * Service Instance Factory
 *
 * Creates default service instances for Lambda handlers with environment configuration.
 * Follows dependency injection pattern for testability while providing convenient defaults.
 *
 * Pattern:
 * - DAL packages export service factories (createXService)
 * - Backend creates default instances with AWS/environment config
 * - Handlers import default instances directly
 * - Tests use factories with test dependencies
 *
 * @module utils/services
 */

import { createDefaultAuthService } from '@social-media-app/dal'
import { createDynamoDBClient, getTableName } from './aws-config.js'
import { createJWTProvider, getJWTConfigFromEnv } from './jwt.js'

/**
 * Default authService instance for Lambda handlers
 *
 * Initialized with Lambda environment configuration:
 * - DynamoDB client pointing to TABLE_NAME env var
 * - JWT provider using JWT_SECRET env var
 * - Production-ready hash and time providers
 *
 * For testing, use createAuthService from DAL with test dependencies.
 *
 * @example
 * ```typescript
 * // In handlers
 * import { authService } from '../utils/services.js'
 *
 * const result = await authService.register(request)
 * ```
 *
 * @example
 * ```typescript
 * // In tests
 * import { createAuthService } from '@social-media-app/dal'
 *
 * const testAuthService = createAuthService({
 *   dynamoClient: mockDynamoClient,
 *   // ... test dependencies
 * })
 * ```
 */
export const authService = createDefaultAuthService(
  createDynamoDBClient(),
  getTableName(),
  createJWTProvider(getJWTConfigFromEnv())
)
