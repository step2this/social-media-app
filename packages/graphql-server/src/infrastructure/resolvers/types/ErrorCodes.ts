/**
 * Centralized Error Codes and Messages
 *
 * Uses const assertion for type safety (SKILL.md best practice #6)
 *
 * Centralizing error codes provides:
 * - Type-safe error codes (no magic strings)
 * - Consistent error messages across resolvers
 * - Easy to update messages in one place
 * - Better IDE autocomplete
 *
 * @example
 * ```typescript
 * throw new GraphQLError(
 *   ERROR_MESSAGES.UNAUTHENTICATED('view feed'),
 *   { extensions: { code: ERROR_CODES.UNAUTHENTICATED } }
 * );
 * ```
 */

/**
 * Error codes as const assertion for type safety
 */
export const ERROR_CODES = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  BAD_REQUEST: 'BAD_REQUEST',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

/**
 * Extract error code type from ERROR_CODES
 */
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * Error message functions by code
 * Each function accepts optional context for customization
 */
export const ERROR_MESSAGES: Record<ErrorCode, (context?: string) => string> = {
  UNAUTHENTICATED: (context = 'perform this action') =>
    `You must be authenticated to ${context}`,
  
  BAD_REQUEST: (context = 'Invalid request') => context,
  
  NOT_FOUND: (context = 'Resource not found') => context,
  
  FORBIDDEN: (context = 'access this resource') =>
    `You don't have permission to ${context}`,
  
  INTERNAL_SERVER_ERROR: (context = 'An error occurred') => context,
};
