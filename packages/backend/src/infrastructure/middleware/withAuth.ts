/**
 * Authentication Middleware
 *
 * Extracts and validates JWT from Authorization header.
 * Adds userId and authPayload to context for downstream middleware/handler.
 *
 * Features:
 * - JWT token extraction from Bearer token
 * - Token validation
 * - Optional vs. required authentication
 * - User context injection
 *
 * @example
 * ```typescript
 * // Required authentication (default)
 * export const handler = compose(
 *   withErrorHandling(),
 *   withAuth(),  // Throws if token missing/invalid
 *   async (event, context) => {
 *     // context.userId is guaranteed to exist
 *     return successResponse(200, { userId: context.userId });
 *   }
 * );
 *
 * // Optional authentication
 * export const handler = compose(
 *   withErrorHandling(),
 *   withAuth(false),  // Doesn't throw if token missing
 *   async (event, context) => {
 *     // context.userId may be undefined
 *     const userId = context.userId || 'anonymous';
 *     return successResponse(200, { userId });
 *   }
 * );
 * ```
 */

import type { Middleware } from './compose.js';
import { UnauthorizedError } from './withErrorHandling.js';
import { verifyAccessToken, getJWTConfigFromEnv } from '../../utils/jwt.js';

/**
 * Authentication middleware factory
 *
 * Extracts JWT from Authorization header, validates it, and adds user info to context.
 * Can be configured as required (default) or optional.
 *
 * @param required - Whether authentication is required (default: true)
 * @returns Middleware function that validates auth and adds userId to context
 *
 * @example
 * ```typescript
 * // Required auth - throws if missing/invalid
 * export const handler = compose(
 *   withErrorHandling(),
 *   withAuth(),  // or withAuth(true)
 *   async (event, context) => {
 *     // context.userId exists (TypeScript can infer this)
 *     await doSomethingWithUser(context.userId);
 *   }
 * );
 *
 * // Optional auth - continues if missing
 * export const handler = compose(
 *   withErrorHandling(),
 *   withAuth(false),
 *   async (event, context) => {
 *     // context.userId may be undefined
 *     if (context.userId) {
 *       // Authenticated user
 *     } else {
 *       // Anonymous user
 *     }
 *   }
 * );
 * ```
 */
export const withAuth = (required: boolean = true): Middleware => {
  return async (event, context, next) => {
    // Try to get Authorization header (case-insensitive)
    const authHeader = event.headers?.authorization || event.headers?.Authorization;

    // No auth header provided
    if (!authHeader) {
      if (required) {
        throw new UnauthorizedError('Missing authorization header');
      }
      // Optional auth - continue without user context
      return next();
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.replace(/^Bearer\s+/i, '');

    // Validate token using standalone function
    const jwtConfig = getJWTConfigFromEnv();

    try {
      const payload = await verifyAccessToken(token, jwtConfig.secret);

      // Check if token verification failed
      if (!payload) {
        if (required) {
          throw new UnauthorizedError('Invalid token');
        }
        // Optional auth - continue without user context
        return next();
      }

      // Add user info to context
      context.userId = payload.userId;
      context.authPayload = payload;

      return next();
    } catch (error) {
      // Token validation failed
      if (required) {
        throw new UnauthorizedError(
          error instanceof Error ? error.message : 'Invalid token'
        );
      }

      // Optional auth - continue without user context
      return next();
    }
  };
};
