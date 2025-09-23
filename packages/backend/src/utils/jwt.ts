import { SignJWT, jwtVerify } from 'jose';
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
  const secret = new TextEncoder().encode(config.secret);

  const generateAccessToken = async (payload: Readonly<{ userId: string; email: string }>): Promise<string> =>
    await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer('social-media-app')
      .setAudience('social-media-app-users')
      .setExpirationTime(`${config.accessTokenExpiry}s`)
      .sign(secret);

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
export const verifyAccessToken = async (token: string, secret: string): Promise<JWTPayload | null> => {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: 'social-media-app',
      audience: 'social-media-app-users',
      algorithms: ['HS256']
    });

    // Extract and validate the required fields from the payload
    if (typeof payload.userId !== 'string' || typeof payload.email !== 'string' ||
        typeof payload.iat !== 'number' || typeof payload.exp !== 'number') {
      console.warn('JWT payload missing required fields or has incorrect types');
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      iat: payload.iat,
      exp: payload.exp
    };
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