/**
 * Application Error Classes
 * 
 * Domain error classes used across DAL and backend layers.
 * These errors represent business logic failures and can be:
 * - Caught by backend Lambda handlers → converted to HTTP responses
 * - Caught by GraphQL resolvers → converted to GraphQL errors
 * - Logged with structured logging for observability
 * 
 * Design principles:
 * - Follow ErrorFactory pattern from GraphQL server
 * - Support correlation IDs for distributed tracing
 * - Integrate with structuredLogger
 * - Provide rich context for debugging
 */

import { ErrorCode } from './ErrorCodes';

/**
 * Base class for all application errors
 * Provides common structure and metadata for all error types
 */
export abstract class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly timestamp: string;
  public readonly correlationId?: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode,
    correlationId?: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date().toISOString();
    this.correlationId = correlationId;
    this.context = context;

    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serialize error for logging
   * Compatible with structuredLogger format
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp,
      correlationId: this.correlationId,
      context: this.context,
      stack: this.stack
    };
  }
}

/**
 * Resource not found (404 equivalent)
 * Usage: User not found, Post not found, Profile not found
 */
export class NotFoundError extends AppError {
  constructor(
    entity: string,
    id: string,
    correlationId?: string,
    context?: Record<string, unknown>
  ) {
    super(
      `${entity} not found: ${id}`,
      'NOT_FOUND',
      correlationId,
      { entity, id, ...context }
    );
  }
}

/**
 * Resource already exists / uniqueness constraint violation (409 equivalent)
 * Usage: Email already registered, Username taken, Handle taken
 */
export class ConflictError extends AppError {
  constructor(
    message: string,
    field: string,
    value: string,
    correlationId?: string,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      'CONFLICT',
      correlationId,
      { field, value, ...context }
    );
  }
}

/**
 * Authentication failure (401 equivalent)
 * Usage: Invalid credentials, token expired, access denied
 */
export class UnauthorizedError extends AppError {
  constructor(
    message: string,
    reason: string,
    correlationId?: string,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      'UNAUTHORIZED',
      correlationId,
      { reason, ...context }
    );
  }
}

/**
 * Permission denied for specific resource (403 equivalent)
 * Usage: User doesn't own post, can't delete others' comments
 */
export class ForbiddenError extends AppError {
  constructor(
    message: string,
    userId: string,
    resourceId: string,
    resourceType: string,
    correlationId?: string,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      'FORBIDDEN',
      correlationId,
      { userId, resourceId, resourceType, ...context }
    );
  }
}

/**
 * Input validation failure (400 equivalent)
 * Usage: Invalid UUID, Zod validation errors, malformed data
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    correlationId?: string,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      'VALIDATION_ERROR',
      correlationId,
      context
    );
  }
}

/**
 * Configuration or infrastructure error (500 equivalent)
 * Usage: S3 bucket not configured, missing env vars
 */
export class ConfigurationError extends AppError {
  constructor(
    message: string,
    configKey: string,
    correlationId?: string,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      'CONFIGURATION_ERROR',
      correlationId,
      { configKey, ...context }
    );
  }
}

/**
 * Database operation failure (500 equivalent)
 * Usage: DynamoDB errors, conditional check failures
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    operation: string,
    originalError?: Error,
    correlationId?: string,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      'DATABASE_ERROR',
      correlationId,
      {
        operation,
        originalError: originalError?.message,
        originalStack: originalError?.stack,
        ...context
      }
    );
  }
}

/**
 * Type guards for error identification
 * Used by backend handlers and GraphQL resolvers to handle specific error types
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

export function isConflictError(error: unknown): error is ConflictError {
  return error instanceof ConflictError;
}

export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return error instanceof UnauthorizedError;
}

export function isForbiddenError(error: unknown): error is ForbiddenError {
  return error instanceof ForbiddenError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isConfigurationError(error: unknown): error is ConfigurationError {
  return error instanceof ConfigurationError;
}

export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}
