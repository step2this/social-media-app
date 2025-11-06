/**
 * Service Injection Middleware
 *
 * Initializes service dependencies and injects them into the middleware context.
 * Provides dependency injection for Lambda handlers without manual instantiation.
 *
 * Features:
 * - Lazy service instantiation (only creates requested services)
 * - DynamoDB client reuse
 * - JWT provider initialization
 * - Type-safe service access via context.services
 *
 * @example
 * ```typescript
 * export const handler = compose(
 *   withErrorHandling(),
 *   withServices(['authService']),
 *   async (event, context) => {
 *     // context.services.authService is available
 *     const result = await context.services.authService.login(credentials);
 *   }
 * );
 * ```
 */

import type { Middleware } from './compose.js';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';
import { createJWTProvider, getJWTConfigFromEnv } from '../../utils/jwt.js';
import { createDefaultAuthService } from '@social-media-app/dal';

/**
 * Available service names that can be injected
 */
export type ServiceName = 'authService';

/**
 * Service injection middleware factory
 *
 * Initializes requested services and adds them to context.services.
 * Services are instantiated once per Lambda invocation.
 *
 * @param serviceNames - Array of service names to inject
 * @returns Middleware function that injects services into context
 *
 * @example
 * ```typescript
 * // Single service
 * export const handler = compose(
 *   withErrorHandling(),
 *   withServices(['authService']),
 *   async (event, context) => {
 *     const user = await context.services.authService.register(data);
 *   }
 * );
 *
 * // Multiple services (future expansion)
 * export const handler = compose(
 *   withErrorHandling(),
 *   withServices(['authService', 'postService']),
 *   async (event, context) => {
 *     // Both services available
 *   }
 * );
 * ```
 */
export const withServices = (serviceNames: ServiceName[]): Middleware => {
  return async (_event, context, next) => {
    // Initialize context.services if not already present
    if (!context.services) {
      context.services = {};
    }

    // Initialize shared dependencies (reused across services)
    const dynamoClient = createDynamoDBClient();
    const tableName = getTableName();

    // Inject requested services
    for (const serviceName of serviceNames) {
      switch (serviceName) {
        case 'authService': {
          const jwtConfig = getJWTConfigFromEnv();
          const jwtProvider = createJWTProvider(jwtConfig);
          context.services.authService = createDefaultAuthService(
            dynamoClient,
            tableName,
            jwtProvider
          );
          break;
        }

        // Future services can be added here:
        // case 'postService': {
        //   context.services.postService = createPostService(dynamoClient, tableName);
        //   break;
        // }

        default:
          // Type-safe: TypeScript will error if invalid service name is used
          // This default case satisfies exhaustiveness checking
          const _exhaustive: never = serviceName;
          throw new Error(`Unknown service: ${String(_exhaustive)}`);
      }
    }

    return next();
  };
};
