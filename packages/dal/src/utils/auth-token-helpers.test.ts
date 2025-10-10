/**
 * Tests for auth token helper utilities
 * Pure functions for token management
 */

import { describe, it, expect } from 'vitest';
import {
  calculateRefreshTokenExpiry,
  createRefreshTokenEntity,
  createAuthTokensResponse,
  type RefreshTokenConfig
} from './auth-token-helpers.js';

describe('calculateRefreshTokenExpiry', () => {
  it('should calculate expiry 30 days from now by default', () => {
    const now = Date.now();
    const result = calculateRefreshTokenExpiry();
    const expiryDate = new Date(result);
    const expectedDate = new Date(now + 30 * 24 * 60 * 60 * 1000);

    // Allow 1 second tolerance for execution time
    const diff = Math.abs(expiryDate.getTime() - expectedDate.getTime());
    expect(diff).toBeLessThan(1000);
  });

  it('should calculate expiry with custom days', () => {
    const now = Date.now();
    const result = calculateRefreshTokenExpiry(7); // 7 days
    const expiryDate = new Date(result);
    const expectedDate = new Date(now + 7 * 24 * 60 * 60 * 1000);

    const diff = Math.abs(expiryDate.getTime() - expectedDate.getTime());
    expect(diff).toBeLessThan(1000);
  });

  it('should calculate expiry with 1 day', () => {
    const now = Date.now();
    const result = calculateRefreshTokenExpiry(1);
    const expiryDate = new Date(result);
    const expectedDate = new Date(now + 1 * 24 * 60 * 60 * 1000);

    const diff = Math.abs(expiryDate.getTime() - expectedDate.getTime());
    expect(diff).toBeLessThan(1000);
  });

  it('should return ISO 8601 formatted string', () => {
    const result = calculateRefreshTokenExpiry();
    // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should calculate expiry with 90 days (extended)', () => {
    const now = Date.now();
    const result = calculateRefreshTokenExpiry(90);
    const expiryDate = new Date(result);
    const expectedDate = new Date(now + 90 * 24 * 60 * 60 * 1000);

    const diff = Math.abs(expiryDate.getTime() - expectedDate.getTime());
    expect(diff).toBeLessThan(1000);
  });
});

describe('createRefreshTokenEntity', () => {
  const mockConfig: RefreshTokenConfig = {
    userId: 'user-123',
    tokenId: 'token-456',
    refreshTokenValue: 'abc123xyz',
    expiresAt: '2025-11-10T00:00:00.000Z',
    createdAt: '2025-10-10T00:00:00.000Z'
  };

  it('should create refresh token entity with all required fields', () => {
    const result = createRefreshTokenEntity(mockConfig);

    expect(result).toEqual({
      PK: 'USER#user-123',
      SK: 'REFRESH_TOKEN#token-456',
      GSI1PK: 'REFRESH_TOKEN#abc123xyz',
      GSI1SK: 'USER#user-123',
      tokenId: 'token-456',
      hashedToken: 'abc123xyz',
      userId: 'user-123',
      expiresAt: '2025-11-10T00:00:00.000Z',
      createdAt: '2025-10-10T00:00:00.000Z',
      entityType: 'REFRESH_TOKEN'
    });
  });

  it('should create refresh token entity without device info', () => {
    const result = createRefreshTokenEntity(mockConfig);
    expect(result.deviceInfo).toBeUndefined();
  });

  it('should create refresh token entity with device info', () => {
    const configWithDevice: RefreshTokenConfig = {
      ...mockConfig,
      deviceInfo: {
        userAgent: 'Mozilla/5.0',
        platform: 'MacOS'
      }
    };

    const result = createRefreshTokenEntity(configWithDevice);

    expect(result.deviceInfo).toEqual({
      userAgent: 'Mozilla/5.0',
      platform: 'MacOS'
    });
  });

  it('should generate correct PK format', () => {
    const result = createRefreshTokenEntity(mockConfig);
    expect(result.PK).toBe('USER#user-123');
  });

  it('should generate correct SK format', () => {
    const result = createRefreshTokenEntity(mockConfig);
    expect(result.SK).toBe('REFRESH_TOKEN#token-456');
  });

  it('should generate correct GSI1PK format for token lookup', () => {
    const result = createRefreshTokenEntity(mockConfig);
    expect(result.GSI1PK).toBe('REFRESH_TOKEN#abc123xyz');
  });

  it('should generate correct GSI1SK format for user lookup', () => {
    const result = createRefreshTokenEntity(mockConfig);
    expect(result.GSI1SK).toBe('USER#user-123');
  });

  it('should set entityType to REFRESH_TOKEN', () => {
    const result = createRefreshTokenEntity(mockConfig);
    expect(result.entityType).toBe('REFRESH_TOKEN');
  });

  it('should be a pure function (same input produces same output)', () => {
    const result1 = createRefreshTokenEntity(mockConfig);
    const result2 = createRefreshTokenEntity(mockConfig);
    expect(result1).toEqual(result2);
  });

  it('should handle different user IDs', () => {
    const config: RefreshTokenConfig = {
      ...mockConfig,
      userId: 'different-user-789'
    };

    const result = createRefreshTokenEntity(config);

    expect(result.PK).toBe('USER#different-user-789');
    expect(result.GSI1SK).toBe('USER#different-user-789');
    expect(result.userId).toBe('different-user-789');
  });

  it('should handle different token values', () => {
    const config: RefreshTokenConfig = {
      ...mockConfig,
      refreshTokenValue: 'xyz789abc'
    };

    const result = createRefreshTokenEntity(config);

    expect(result.GSI1PK).toBe('REFRESH_TOKEN#xyz789abc');
    expect(result.hashedToken).toBe('xyz789abc');
  });
});

describe('createAuthTokensResponse', () => {
  it('should create auth tokens response with default expiresIn', () => {
    const result = createAuthTokensResponse('access-token-123', 'refresh-token-456');

    expect(result).toEqual({
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-456',
      expiresIn: 900 // 15 minutes default
    });
  });

  it('should create auth tokens response with custom expiresIn', () => {
    const result = createAuthTokensResponse('access-token-123', 'refresh-token-456', 3600);

    expect(result).toEqual({
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-456',
      expiresIn: 3600
    });
  });

  it('should create auth tokens response with 0 expiresIn', () => {
    const result = createAuthTokensResponse('access-token-123', 'refresh-token-456', 0);

    expect(result).toEqual({
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-456',
      expiresIn: 0
    });
  });

  it('should be a pure function', () => {
    const result1 = createAuthTokensResponse('token-a', 'token-b', 1800);
    const result2 = createAuthTokensResponse('token-a', 'token-b', 1800);
    expect(result1).toEqual(result2);
  });

  it('should handle different token values', () => {
    const result = createAuthTokensResponse('different-access', 'different-refresh', 7200);

    expect(result.accessToken).toBe('different-access');
    expect(result.refreshToken).toBe('different-refresh');
    expect(result.expiresIn).toBe(7200);
  });

  it('should handle empty string tokens', () => {
    const result = createAuthTokensResponse('', '');

    expect(result).toEqual({
      accessToken: '',
      refreshToken: '',
      expiresIn: 900
    });
  });
});
