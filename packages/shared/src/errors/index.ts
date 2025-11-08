/**
 * Shared Error Infrastructure
 * 
 * This module exports error classes and utilities used across all layers:
 * - DAL services (throw AppErrors)
 * - Backend Lambda handlers (catch AppErrors → HTTP responses)
 * - GraphQL resolvers (catch AppErrors → GraphQL errors)
 * 
 * Architecture:
 * ```
 * Domain Layer (DAL) → throws AppError
 *         ↓
 * Backend Layer → converts to HTTP status codes
 *         ↓
 * GraphQL Layer → converts to GraphQLError
 * ```
 */

// Error codes (single source of truth)
export { ErrorCode, ERROR_CODE_TO_HTTP_STATUS } from './ErrorCodes';

// Error classes
export {
  AppError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  ConfigurationError,
  DatabaseError,
} from './AppErrors';

// Type guards
export {
  isAppError,
  isNotFoundError,
  isConflictError,
  isUnauthorizedError,
  isForbiddenError,
  isValidationError,
  isConfigurationError,
  isDatabaseError,
} from './AppErrors';
