/**
 * ErrorFactory
 *
 * Factory for creating standardized GraphQL errors with consistent error codes.
 * Provides type-safe error creation methods for common error scenarios.
 *
 * This replaces scattered error creation across resolvers:
 *
 * Before:
 * ```typescript
 * throw new GraphQLError('You must be authenticated', {
 *   extensions: { code: 'UNAUTHENTICATED' }
 * });
 * ```
 *
 * After:
 * ```typescript
 * throw ErrorFactory.unauthenticated();
 * ```
 *
 * Benefits:
 * - Consistent error messages and codes
 * - Type-safe error codes (ErrorCode type)
 * - Less boilerplate
 * - Easier to maintain
 * - Self-documenting error scenarios
 */

import { GraphQLError } from 'graphql';

/**
 * ErrorCode - Standard GraphQL error codes
 *
 * These codes follow GraphQL best practices and Apollo Server conventions.
 *
 * @see https://www.apollographql.com/docs/apollo-server/data/errors/#built-in-error-codes
 */
export type ErrorCode =
  | 'UNAUTHENTICATED'     // User is not authenticated (401)
  | 'UNAUTHORIZED'        // User is authenticated but lacks permissions (403)
  | 'NOT_FOUND'           // Resource not found (404)
  | 'BAD_REQUEST'         // Invalid input or request (400)
  | 'INTERNAL_SERVER_ERROR'; // Unexpected server error (500)

/**
 * ErrorFactory - Factory for creating GraphQL errors
 *
 * Provides static methods for creating common error types.
 * All methods create GraphQLError instances with proper extensions.
 *
 * Features:
 * - Type-safe error codes
 * - Consistent error structure
 * - Optional custom messages
 * - Zero dependencies (except graphql)
 * - Stateless (all static methods)
 *
 * @example
 * ```typescript
 * // In a resolver:
 * const meResolver = async (_parent, _args, context) => {
 *   if (!context.userId) {
 *     throw ErrorFactory.unauthenticated();
 *   }
 *
 *   const profile = await profileService.getById(context.userId);
 *
 *   if (!profile) {
 *     throw ErrorFactory.notFound('Profile', context.userId);
 *   }
 *
 *   return profile;
 * };
 * ```
 */
export class ErrorFactory {
  /**
   * Create a GraphQLError with a specific code.
   *
   * This is the base method used by all other factory methods.
   * Prefer using specific methods (unauthenticated(), notFound(), etc.)
   * over this generic method.
   *
   * @param message - The error message to display
   * @param code - The error code (type-safe)
   * @returns A GraphQLError with the specified message and code
   *
   * @example
   * ```typescript
   * const error = ErrorFactory.create('Invalid input', 'BAD_REQUEST');
   * throw error;
   * ```
   */
  static create(message: string, code: ErrorCode): GraphQLError {
    return new GraphQLError(message, {
      extensions: {
        code,
      },
    });
  }

  /**
   * Create an UNAUTHENTICATED error.
   *
   * Use this when a user must be authenticated to access a resource.
   * Maps to HTTP 401 Unauthorized.
   *
   * @param message - Optional custom message (defaults to standard message)
   * @returns GraphQLError with UNAUTHENTICATED code
   *
   * @example
   * ```typescript
   * if (!context.userId) {
   *   throw ErrorFactory.unauthenticated();
   * }
   *
   * // With custom message:
   * throw ErrorFactory.unauthenticated('Please log in to continue');
   * ```
   */
  static unauthenticated(message = 'You must be authenticated to access this resource'): GraphQLError {
    return this.create(message, 'UNAUTHENTICATED');
  }

  /**
   * Create an UNAUTHORIZED error.
   *
   * Use this when a user is authenticated but lacks permissions.
   * Maps to HTTP 403 Forbidden.
   *
   * Difference from UNAUTHENTICATED:
   * - UNAUTHENTICATED: User is not logged in (no token)
   * - UNAUTHORIZED: User is logged in but can't perform this action
   *
   * @param message - Optional custom message (defaults to standard message)
   * @returns GraphQLError with UNAUTHORIZED code
   *
   * @example
   * ```typescript
   * if (post.userId !== context.userId) {
   *   throw ErrorFactory.unauthorized('You cannot delete this post');
   * }
   * ```
   */
  static unauthorized(message = 'You do not have permission to perform this action'): GraphQLError {
    return this.create(message, 'UNAUTHORIZED');
  }

  /**
   * Create a NOT_FOUND error.
   *
   * Use this when a requested resource does not exist.
   * Maps to HTTP 404 Not Found.
   *
   * @param entity - The entity type (e.g., 'User', 'Post', 'Comment')
   * @param id - The ID that was not found
   * @returns GraphQLError with NOT_FOUND code
   *
   * @example
   * ```typescript
   * const post = await postService.getById(id);
   * if (!post) {
   *   throw ErrorFactory.notFound('Post', id);
   * }
   * ```
   */
  static notFound(entity: string, id: string): GraphQLError {
    return this.create(`${entity} not found: ${id}`, 'NOT_FOUND');
  }

  /**
   * Create a BAD_REQUEST error.
   *
   * Use this for validation errors or invalid input.
   * Maps to HTTP 400 Bad Request.
   *
   * @param message - The validation error message
   * @returns GraphQLError with BAD_REQUEST code
   *
   * @example
   * ```typescript
   * if (!email.includes('@')) {
   *   throw ErrorFactory.badRequest('Email must be a valid email address');
   * }
   *
   * if (password.length < 8) {
   *   throw ErrorFactory.badRequest('Password must be at least 8 characters');
   * }
   * ```
   */
  static badRequest(message: string): GraphQLError {
    return this.create(message, 'BAD_REQUEST');
  }

  /**
   * Create an INTERNAL_SERVER_ERROR.
   *
   * Use this for unexpected errors or system failures.
   * Maps to HTTP 500 Internal Server Error.
   *
   * Note: Be careful not to expose sensitive error details to clients.
   * Use generic messages in production.
   *
   * @param message - Optional custom message (defaults to generic message)
   * @returns GraphQLError with INTERNAL_SERVER_ERROR code
   *
   * @example
   * ```typescript
   * try {
   *   const result = await database.query(sql);
   *   return result;
   * } catch (error) {
   *   // Log the actual error internally
   *   logger.error('Database error:', error);
   *
   *   // Return generic error to client
   *   throw ErrorFactory.internalServerError();
   * }
   * ```
   */
  static internalServerError(message = 'An internal server error occurred'): GraphQLError {
    return this.create(message, 'INTERNAL_SERVER_ERROR');
  }
}
