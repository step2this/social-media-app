/**
 * JWT utilities
 * Re-exports from @social-media-app/auth-utils for backward compatibility
 */

export {
  verifyAccessToken,
  generateAccessToken,
  generateRefreshToken,
  extractTokenFromHeader,
  getJWTConfigFromEnv,
  type JWTPayload,
  type JWTConfig
} from '@social-media-app/auth-utils';

import type { AuthServiceDependencies } from '@social-media-app/dal';
import { generateAccessTokenWithConfig, generateRefreshToken as _genRefreshToken } from '@social-media-app/auth-utils';

/**
 * Create JWT provider implementation for DAL AuthService
 * This is backend-specific and remains here
 *
 * Uses the secure generateAccessTokenWithConfig() which accepts config directly
 * instead of modifying process.env (which can cause race conditions)
 */
export const createJWTProvider = (config: Readonly<{ secret: string; accessTokenExpiry: number; refreshTokenExpiry: number }>): AuthServiceDependencies['jwtProvider'] => {

  const generateAccessToken = async (payload: Readonly<{ userId: string; email: string }>): Promise<string> => {
    // Use the config-based function to avoid environment variable manipulation
    return await generateAccessTokenWithConfig(payload, {
      secret: config.secret,
      expirySeconds: config.accessTokenExpiry
    });
  };

  const generateRefreshToken = (): string => _genRefreshToken();

  const verifyRefreshToken = async (): Promise<Readonly<{ userId: string }> | null> =>
    // Refresh tokens are stored in DynamoDB and verified there
    // This is a placeholder - actual verification happens in the auth service
    // when looking up the token in the database
    null;

  return {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken
  };
};
