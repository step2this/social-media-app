/**
 * Environment configuration loader for backend services
 * Loads .env files only in development mode for local testing
 */

/**
 * Load environment variables for local development
 * In production (AWS Lambda), environment variables are injected by the runtime
 */
export const loadEnvironment = (): void => {
  // Only load .env files in development mode
  if (process.env.NODE_ENV === 'development' || !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    try {
      // Dynamic import to avoid bundling dotenv in production
      import('dotenv').then(({ config }) => {
        config({ path: '../../.env' }); // Load from project root
      }).catch(() => {
        // Silently fail if dotenv is not available (production builds)
      });
    } catch {
      // Silently fail - dotenv not available
    }
  }
};

/**
 * Synchronous environment loading for immediate use
 * Use this when you need environment variables loaded immediately
 */
export const loadEnvironmentSync = (): void => {
  // Only load .env files in development mode
  if (process.env.NODE_ENV === 'development' || !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    try {
      // Use require for synchronous loading in development
      const dotenv = require('dotenv');
      dotenv.config({ path: '../../.env' }); // Load from project root
    } catch {
      // Silently fail - dotenv not available
    }
  }
};

/**
 * Get environment variable with fallback
 */
export const getEnvVar = (key: string, fallback?: string): string | undefined => {
  return process.env[key] || fallback;
};

/**
 * Get required environment variable
 * Throws error if not found
 */
export const getRequiredEnvVar = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
};