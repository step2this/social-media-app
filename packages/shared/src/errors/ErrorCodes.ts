/**
 * Shared Error Codes
 * 
 * Single source of truth for error codes used across all layers:
 * - DAL services (domain errors)
 * - Backend Lambda handlers (HTTP status codes)
 * - GraphQL server (GraphQL error extensions)
 * 
 * These codes follow GraphQL best practices and map to HTTP status codes.
 * 
 * Note: UNAUTHENTICATED and BAD_REQUEST are kept for GraphQL backward compatibility.
 */
export type ErrorCode =
  | 'UNAUTHENTICATED'     // GraphQL legacy: user not authenticated (401) - use UNAUTHORIZED in new code
  | 'NOT_FOUND'           // Resource not found (404)
  | 'CONFLICT'            // Resource already exists / uniqueness violation (409)
  | 'UNAUTHORIZED'        // Authentication failure (401)
  | 'FORBIDDEN'           // Permission denied (403)
  | 'BAD_REQUEST'         // GraphQL legacy: validation error (400) - use VALIDATION_ERROR in new code
  | 'VALIDATION_ERROR'    // Input validation failure (400)
  | 'CONFIGURATION_ERROR' // Configuration or infrastructure error (500)
  | 'DATABASE_ERROR'      // Database operation failure (500)
  | 'INTERNAL_SERVER_ERROR'; // Generic server error (500)

/**
 * Maps error codes to HTTP status codes
 * Used by backend Lambda handlers to convert AppErrors to HTTP responses
 */
export const ERROR_CODE_TO_HTTP_STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 400,
  CONFIGURATION_ERROR: 500,
  DATABASE_ERROR: 500,
  INTERNAL_SERVER_ERROR: 500,
};
