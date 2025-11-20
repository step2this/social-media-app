/**
 * Environment configuration for backend services
 *
 * DEPRECATED: This file is being phased out in favor of @social-media-app/env
 * Please use the centralized environment package for new code:
 *
 * import { baseEnv } from '@social-media-app/env';
 *
 * This file is kept for backward compatibility during migration.
 */

import { baseEnv } from '@social-media-app/env';

/**
 * Get environment variable with fallback
 * @deprecated Use baseEnv directly from @social-media-app/env
 */
export const getEnvVar = (key: string, fallback?: string): string | undefined => {
  return (baseEnv as Record<string, unknown>)[key] as string | undefined || fallback;
};

/**
 * Get required environment variable
 * @deprecated Use baseEnv directly from @social-media-app/env
 * @throws Error if not found
 */
export const getRequiredEnvVar = (key: string): string => {
  const value = (baseEnv as Record<string, unknown>)[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value as string;
};