/**
 * Follow Error Handler Utilities
 * Pure functions for formatting and handling follow operation errors
 */

/**
 * Context information for follow operation errors
 */
export interface FollowErrorContext {
  operation: 'follow' | 'unfollow' | 'fetch';
  userId: string;
  error: unknown;
}

/**
 * Creates default error message for follow operation
 *
 * @param customMessage - Optional custom error message
 * @returns Error message string
 */
export const createFollowErrorMessage = (
  customMessage?: string
): string => {
  return customMessage ?? 'Failed to follow user';
};

/**
 * Creates default error message for unfollow operation
 *
 * @param customMessage - Optional custom error message
 * @returns Error message string
 */
export const createUnfollowErrorMessage = (
  customMessage?: string
): string => {
  return customMessage ?? 'Failed to unfollow user';
};

/**
 * Creates default error message for fetch status operation
 *
 * @param customMessage - Optional custom error message
 * @returns Error message string
 */
export const createFetchStatusErrorMessage = (
  customMessage?: string
): string => {
  return customMessage ?? 'Failed to fetch follow status';
};

/**
 * Extracts error message from various error types
 * Handles Error objects, axios errors, and unknown error types
 *
 * @param error - Error of any type
 * @returns Extracted error message
 */
export const extractFollowErrorMessage = (error: unknown): string => {
  // Handle null/undefined
  if (error === null || error === undefined) {
    return 'Unknown error occurred';
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Handle Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Handle object errors with response.data.message (axios-style)
  if (
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object'
  ) {
    const response = error.response as any;

    // Check for response.data.message
    if (response.data?.message) {
      return response.data.message;
    }

    // Check for response.data.error
    if (typeof response.data?.error === 'string') {
      return response.data.error;
    }

    // Check for nested error.message
    if (response.data?.error?.message) {
      return response.data.error.message;
    }
  }

  // Handle object errors with message property
  if (
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as any).message === 'string'
  ) {
    return (error as any).message;
  }

  // Unknown error type
  return 'Unknown error occurred';
};

/**
 * Determines if error is a network-related error
 *
 * @param error - Error to check
 * @returns True if error is network-related
 */
export const isNetworkError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('econnrefused') ||
    message.includes('timeout')
  );
};

/**
 * Determines if error is an authentication error
 * Checks for 401/403 status codes or auth-related messages
 *
 * @param error - Error to check
 * @returns True if error is authentication-related
 */
export const isAuthenticationError = (error: unknown): boolean => {
  // Check for HTTP status codes
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object'
  ) {
    const response = error.response as any;
    if (response.status === 401 || response.status === 403) {
      return true;
    }
  }

  // Check for auth-related messages
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('unauthorized') ||
      message.includes('not authenticated') ||
      message.includes('authentication required')
    );
  }

  return false;
};

/**
 * Formats follow operation error with context for user-friendly display
 * Provides specific messages for network and authentication errors
 *
 * @param context - Error context including operation, userId, and error
 * @returns Formatted error message
 */
export const formatFollowOperationError = (
  context: FollowErrorContext
): string => {
  const { operation, userId, error } = context;

  // Check for specific error types
  if (isNetworkError(error)) {
    return `Network error while trying to ${operation} user ${userId}. Please check your connection.`;
  }

  if (isAuthenticationError(error)) {
    return `Authentication required to ${operation} user ${userId}. Please log in again.`;
  }

  // Generic error with extracted message
  const errorMessage = extractFollowErrorMessage(error);
  return `Failed to ${operation} user ${userId}: ${errorMessage}`;
};
