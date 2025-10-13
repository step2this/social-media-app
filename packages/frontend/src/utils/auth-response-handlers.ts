/**
 * Authentication Response Handler Utilities
 *
 * Pure functions for processing authentication API responses.
 * Handles conditional auto-login logic and response validation.
 */

import type { RegisterResponse, AuthTokens, User } from '@social-media-app/shared';
import { buildUserWithFallbacks } from './auth-user-builder.js';

/**
 * Type guard to check if a response contains tokens
 *
 * @param response - The API response to check
 * @returns True if response has tokens object
 */
export const hasTokensInResponse = (response: RegisterResponse): boolean => !!(response.tokens);

/**
 * Determines if user should be automatically logged in after registration
 * Auto-login happens when the registration response includes tokens
 *
 * @param response - Registration API response
 * @returns True if auto-login should occur
 */
export const shouldAutoLogin = (response: RegisterResponse): boolean => hasTokensInResponse(response);

/**
 * Processes registration response and returns structured result
 * Handles conditional auto-login logic and user normalization
 *
 * @param response - Registration API response
 * @returns Processed result with login decision, user data, and tokens
 */
export const processRegisterResponse = (
  response: RegisterResponse
): {
  shouldLogin: boolean;
  user: User | null;
  tokens: AuthTokens | null;
} => {
  if (!shouldAutoLogin(response)) {
    return {
      shouldLogin: false,
      user: null,
      tokens: null,
    };
  }

  // Auto-login: normalize user and return with tokens
  const normalizedUser = buildUserWithFallbacks(response.user);

  return {
    shouldLogin: true,
    user: normalizedUser,
    tokens: response.tokens!,
  };
};
