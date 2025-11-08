/**
 * ErrorFactory - Converts domain errors to GraphQL errors
 *
 * Factory for creating standardized GraphQL errors with consistent error codes.
 * Serves two primary purposes:
 * 1. Convert AppError instances from domain/DAL layer to GraphQL errors (primary use)
 * 2. Provide convenience methods for creating errors directly (backward compatibility)
 *
 * Architecture:
 * - Domain/DAL layer throws AppError with business context
 * - GraphQL resolvers catch AppError and convert using fromAppError()
 * - Error codes are shared across all layers (single source of truth)
 *
 * Before (scattered error creation):
 * ```typescript
 * throw new GraphQLError('You must be authenticated', {
 *   extensions: { code: 'UNAUTHENTICATED' }
 * });
 * ```
 *
 * After (domain error conversion):
 * ```typescript
 * try {
 *   const result = await useCase.execute(args);
 *   if (!result.success) throw ErrorFactory.fromAppError(result.error);
 * } catch (error) {
 *   if (error instanceof AppError) {
 *     throw ErrorFactory.fromAppError(error);
 *   }
 *   throw ErrorFactory.internalServerError();
 * }
 * ```
 *
 * Benefits:
 * - Unified error handling across all layers
 * - Consistent error messages and codes
 * - Rich error context from domain layer
 * - Correlation IDs for distributed tracing
 * - Type-safe error handling
 */

import { GraphQLError } from 'graphql';
import { 
  AppError, 
  NotFoundError, 
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError
} from '@social-media-app/shared/errors';
import type { ErrorCode } from '@social-media-app/shared/errors';

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
   * Convert domain AppError to GraphQL error (PRIMARY METHOD)
   *
   * This is the primary method for error handling in resolvers.
   * Preserves all error context including correlation IDs.
   *
   * @example
   * ```typescript
   * try {
   *   const result = await useCase.execute(args);
   *   if (!result.success) {
   *     throw ErrorFactory.fromAppError(result.error);
   *   }
   * } catch (error) {
   *   if (error instanceof AppError) {
   *     throw ErrorFactory.fromAppError(error);
   *   }
   *   throw ErrorFactory.internalServerError();
   * }
   * ```
   */
  static fromAppError(error: AppError): GraphQLError {
    return new GraphQLError(error.message, {
      extensions: {
        code: error.code,
        correlationId: error.correlationId,
        context: error.context,
        timestamp: error.timestamp
      }
    });
  }

  /**
   * Convert use case error to GraphQL error
   *
   * This method handles errors from use case Result types.
   * It intelligently converts AppError instances and generic Errors.
   *
   * @param error - Error from use case Result (AppError or generic Error)
   * @returns GraphQLError with appropriate code and message
   *
   * @example
   * ```typescript
   * const result = await useCase.execute(input);
   * if (!result.success) {
   *   throw ErrorFactory.fromUseCaseError(result.error);
   * }
   * ```
   */
  static fromUseCaseError(error: Error | AppError): GraphQLError {
    // If it's an AppError, use the specialized converter
    if (error instanceof AppError) {
      return this.fromAppError(error);
    }

    // If it's a recognized error subclass, map it appropriately
    if (error instanceof NotFoundError) {
      return this.create(error.message, 'NOT_FOUND');
    }

    if (error instanceof ConflictError) {
      return this.create(error.message, 'CONFLICT');
    }

    if (error instanceof UnauthorizedError) {
      return this.create(error.message, 'UNAUTHORIZED');
    }

    if (error instanceof ForbiddenError) {
      return this.create(error.message, 'FORBIDDEN');
    }

    if (error instanceof ValidationError) {
      return this.create(error.message, 'BAD_REQUEST');
    }

    // Generic error - return as internal server error
    return this.internalServerError(error.message);
  }

  /**
   * Create a GraphQLError with a specific code and optional correlation ID.
   *
   * This is the base method used by all other factory methods.
   * Prefer using specific methods (unauthenticated(), notFound(), etc.)
   * or fromAppError() over this generic method.
   *
   * When a correlation ID is provided, it's included in the error extensions
   * for distributed tracing and debugging.
   *
   * @param message - The error message to display
   * @param code - The error code (type-safe)
   * @param correlationId - Optional correlation ID for tracing
   * @returns A GraphQLError with the specified message, code, and correlation ID
   *
   * @example
   * ```typescript
   * const error = ErrorFactory.create(
   *   'Invalid input',
   *   'VALIDATION_ERROR',
   *   context.correlationId
   * );
   * throw error;
   * ```
   */
  private static create(
    message: string,
    code: ErrorCode,
    correlationId?: string
  ): GraphQLError {
    const extensions: Record<string, any> = { code };
    
    if (correlationId) {
      extensions.correlationId = correlationId;
    }

    return new GraphQLError(message, {
      extensions,
    });
  }

  /**
   * Create an UNAUTHENTICATED error.
   *
   * Use this when a user must be authenticated to access a resource.
   * Maps to HTTP 401 Unauthorized.
   *
   * @param message - Optional custom message (defaults to standard message)
   * @param correlationId - Optional correlation ID for tracing
   * @returns GraphQLError with UNAUTHENTICATED code
   *
   * @example
   * ```typescript
   * if (!context.userId) {
   *   throw ErrorFactory.unauthenticated(undefined, context.correlationId);
   * }
   *
   * // With custom message:
   * throw ErrorFactory.unauthenticated('Please log in to continue', context.correlationId);
   * ```
   */
  static unauthenticated(message = 'You must be authenticated to access this resource', correlationId?: string): GraphQLError {
    return this.create(message, 'UNAUTHENTICATED', correlationId);
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
   * @param correlationId - Optional correlation ID for tracing
   * @returns GraphQLError with UNAUTHORIZED code
   *
   * @example
   * ```typescript
   * if (post.userId !== context.userId) {
   *   throw ErrorFactory.unauthorized('You cannot delete this post', context.correlationId);
   * }
   * ```
   */
  static unauthorized(message = 'You do not have permission to perform this action', correlationId?: string): GraphQLError {
    return this.create(message, 'UNAUTHORIZED', correlationId);
  }

  /**
   * Create a NOT_FOUND error.
   *
   * Use this when a requested resource does not exist.
   * Maps to HTTP 404 Not Found.
   *
   * @param entity - The entity type (e.g., 'User', 'Post', 'Comment')
   * @param id - The ID that was not found
   * @param correlationId - Optional correlation ID for tracing
   * @returns GraphQLError with NOT_FOUND code
   *
   * @example
   * ```typescript
   * const post = await postService.getById(id);
   * if (!post) {
   *   throw ErrorFactory.notFound('Post', id, context.correlationId);
   * }
   * ```
   */
  static notFound(entity: string, id: string, correlationId?: string): GraphQLError {
    return this.create(`${entity} not found: ${id}`, 'NOT_FOUND', correlationId);
  }

  /**
   * Create a BAD_REQUEST error.
   *
   * Use this for validation errors or invalid input.
   * Maps to HTTP 400 Bad Request.
   *
   * @param message - The validation error message
   * @param correlationId - Optional correlation ID for tracing
   * @returns GraphQLError with BAD_REQUEST code
   *
   * @example
   * ```typescript
   * if (!email.includes('@')) {
   *   throw ErrorFactory.badRequest('Email must be a valid email address', context.correlationId);
   * }
   *
   * if (password.length < 8) {
   *   throw ErrorFactory.badRequest('Password must be at least 8 characters', context.correlationId);
   * }
   * ```
   */
  static badRequest(message: string, correlationId?: string): GraphQLError {
    return this.create(message, 'BAD_REQUEST', correlationId);
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
   * @param correlationId - Optional correlation ID for tracing
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
   *   throw ErrorFactory.internalServerError(undefined, context.correlationId);
   * }
   * ```
   */
  static internalServerError(message = 'An internal server error occurred', correlationId?: string): GraphQLError {
    return this.create(message, 'INTERNAL_SERVER_ERROR', correlationId);
  }
}
