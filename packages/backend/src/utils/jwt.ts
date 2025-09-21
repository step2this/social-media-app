import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import type { AuthServiceDependencies } from '@social-media-app/dal';

/**
 * JWT payload interface
 */
export interface JWTPayload {
  readonly userId: string;
  readonly email: string;
  readonly iat: number;
  readonly exp: number;
}

/**
 * JWT configuration
 */
export interface JWTConfig {
  readonly secret: string;
  readonly accessTokenExpiry: number; // seconds
  readonly refreshTokenExpiry: number; // seconds
}

/**
 * Create JWT provider implementation
 */
export const createJWTProvider = (config: Readonly<JWTConfig>): AuthServiceDependencies['jwtProvider'] => {
  const generateAccessToken = async (payload: Readonly<{ userId: string; email: string }>): Promise<string> =>
    jwt.sign(
      payload,
      config.secret,
      {
        expiresIn: config.accessTokenExpiry,
        algorithm: 'HS256',
        issuer: 'social-media-app',
        audience: 'social-media-app-users'
      }
    );

  const generateRefreshToken = (): string =>
    // Generate a secure random refresh token
    randomBytes(32).toString('hex');

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

/**
 * Verify and decode JWT access token
 */
export const verifyAccessToken = (token: string, secret: string): JWTPayload | null => {
  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: 'social-media-app',
      audience: 'social-media-app-users'
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    console.warn('JWT verification failed:', error instanceof Error ? error.message : String(error));
    return null;
  }
};

/**
 * Extract JWT token from Authorization header
 */
export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Get JWT configuration from environment variables
 */
export const getJWTConfigFromEnv = (): JWTConfig => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  const accessTokenExpiry = process.env.JWT_ACCESS_TOKEN_EXPIRY
    ? parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRY, 10)
    : 900; // 15 minutes default

  const refreshTokenExpiry = process.env.JWT_REFRESH_TOKEN_EXPIRY
    ? parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRY, 10)
    : 2592000; // 30 days default

  return {
    secret,
    accessTokenExpiry,
    refreshTokenExpiry
  };
};