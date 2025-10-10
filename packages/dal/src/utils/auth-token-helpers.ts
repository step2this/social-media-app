/**
 * Auth token helper utilities
 * Pure functions for token management and creation
 */

import type { AuthTokens } from '@social-media-app/shared';
import type { RefreshTokenEntity } from '../services/auth.service.js';

/**
 * Configuration for creating a refresh token entity
 */
export interface RefreshTokenConfig {
  readonly userId: string;
  readonly tokenId: string;
  readonly refreshTokenValue: string;
  readonly deviceInfo?: {
    readonly userAgent?: string;
    readonly platform?: string;
  };
  readonly expiresAt: string;
  readonly createdAt: string;
}

/**
 * Calculates the expiry date for a refresh token
 * Pure function - no side effects
 *
 * @param daysFromNow - Number of days until expiry (default: 30)
 * @returns ISO 8601 formatted expiry date string
 *
 * @example
 * ```typescript
 * const expiry = calculateRefreshTokenExpiry(30);
 * // Returns: "2025-11-09T00:00:00.000Z"
 * ```
 */
export const calculateRefreshTokenExpiry = (daysFromNow: number = 30): string => {
  const expiryDate = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  return expiryDate.toISOString();
};

/**
 * Creates a refresh token entity for DynamoDB storage
 * Factory function - constructs entity with proper key structure
 *
 * @param config - Refresh token configuration
 * @returns RefreshTokenEntity ready for DynamoDB
 *
 * @example
 * ```typescript
 * const entity = createRefreshTokenEntity({
 *   userId: 'user-123',
 *   tokenId: 'token-456',
 *   refreshTokenValue: 'abc123xyz',
 *   expiresAt: '2025-11-10T00:00:00.000Z',
 *   createdAt: '2025-10-10T00:00:00.000Z',
 *   deviceInfo: {
 *     userAgent: 'Mozilla/5.0',
 *     platform: 'MacOS'
 *   }
 * });
 * ```
 */
export const createRefreshTokenEntity = (
  config: RefreshTokenConfig
): RefreshTokenEntity => {
  const {
    userId,
    tokenId,
    refreshTokenValue,
    deviceInfo,
    expiresAt,
    createdAt
  } = config;

  return {
    PK: `USER#${userId}`,
    SK: `REFRESH_TOKEN#${tokenId}`,
    GSI1PK: `REFRESH_TOKEN#${refreshTokenValue}`,
    GSI1SK: `USER#${userId}`,
    tokenId,
    hashedToken: refreshTokenValue,
    userId,
    ...(deviceInfo && { deviceInfo }),
    expiresAt,
    createdAt,
    entityType: 'REFRESH_TOKEN'
  };
};

/**
 * Creates an auth tokens response object
 * Pure function - formats tokens for API response
 *
 * @param accessToken - JWT access token
 * @param refreshToken - Refresh token value
 * @param expiresIn - Token expiry in seconds (default: 900 = 15 minutes)
 * @returns AuthTokens response object
 *
 * @example
 * ```typescript
 * const tokens = createAuthTokensResponse(
 *   'eyJhbGciOiJIUzI1NiIs...',
 *   'abc123xyz',
 *   900
 * );
 * ```
 */
export const createAuthTokensResponse = (
  accessToken: string,
  refreshToken: string,
  expiresIn: number = 900
): AuthTokens => ({
  accessToken,
  refreshToken,
  expiresIn
});
