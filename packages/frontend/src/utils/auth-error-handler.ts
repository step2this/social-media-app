/**
 * Authentication Error Handler Utilities
 *
 * Pure functions for handling authentication errors consistently across the application.
 * Extracts error messages from various error types and provides operation-specific
 * fallback messages.
 */

/**
 * Type guard to check if an error is an authentication-related error
 * (ApiError, NetworkError, or ValidationError)
 *
 * @param error - The error to check
 * @returns True if the error is an auth error type
 */
export const isAuthError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const errorName = (error as Error).name;
  return errorName === 'ApiError' ||
         errorName === 'NetworkError' ||
         errorName === 'ValidationError';
};

/**
 * Extracts error message from known error types
 *
 * @param error - The error to extract message from
 * @returns The error message or null if not available
 */
export const extractAuthErrorMessage = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const message = (error as Error).message;

  // Return null for missing or empty messages
  if (!message || message.trim() === '') {
    return null;
  }

  return message;
};

/**
 * Creates a user-friendly error message for registration failures
 *
 * @param error - The error that occurred during registration
 * @returns A user-friendly error message
 */
export const createRegisterErrorMessage = (error: unknown): string => {
  if (isAuthError(error)) {
    const message = extractAuthErrorMessage(error);
    if (message) {
      return message;
    }
  }

  return 'Registration failed. Please try again.';
};

/**
 * Creates a user-friendly error message for login failures
 *
 * @param error - The error that occurred during login
 * @returns A user-friendly error message
 */
export const createLoginErrorMessage = (error: unknown): string => {
  if (isAuthError(error)) {
    const message = extractAuthErrorMessage(error);
    if (message) {
      return message;
    }
  }

  return 'Login failed. Please check your credentials.';
};

/**
 * Creates a user-friendly error message for profile retrieval failures
 *
 * @param error - The error that occurred during profile retrieval
 * @returns A user-friendly error message
 */
export const createProfileErrorMessage = (error: unknown): string => {
  if (isAuthError(error)) {
    const message = extractAuthErrorMessage(error);
    if (message) {
      return message;
    }
  }

  return 'Failed to get profile. Please try again.';
};

/**
 * Creates a user-friendly error message for profile update failures
 *
 * @param error - The error that occurred during profile update
 * @returns A user-friendly error message
 */
export const createUpdateProfileErrorMessage = (error: unknown): string => {
  if (isAuthError(error)) {
    const message = extractAuthErrorMessage(error);
    if (message) {
      return message;
    }
  }

  return 'Failed to update profile. Please try again.';
};
