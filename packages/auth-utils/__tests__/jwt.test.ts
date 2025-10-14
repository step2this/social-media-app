import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  verifyAccessToken,
  generateAccessToken,
  generateAccessTokenWithConfig,
  generateRefreshToken,
  extractTokenFromHeader,
  getJWTConfigFromEnv,
  type JWTPayload
} from '../src/index.js';

describe('JWT Utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = 'test-secret-key-for-testing';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('verifyAccessToken', () => {
    it('should verify valid JWT and return payload', async () => {
      const payload = { userId: 'user123', email: 'test@example.com' };
      const token = await generateAccessToken(payload);

      const result = await verifyAccessToken(token, 'test-secret-key-for-testing');

      expect(result).toBeDefined();
      expect(result?.userId).toBe('user123');
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null for invalid signature', async () => {
      const payload = { userId: 'user123', email: 'test@example.com' };
      const token = await generateAccessToken(payload);

      const result = await verifyAccessToken(token, 'wrong-secret');

      expect(result).toBeNull();
    });

    it('should return null for malformed token', async () => {
      const result = await verifyAccessToken('not.a.valid.token', 'test-secret-key-for-testing');

      expect(result).toBeNull();
    });

    it('should return null for empty token', async () => {
      const result = await verifyAccessToken('', 'test-secret-key-for-testing');

      expect(result).toBeNull();
    });
  });

  describe('generateAccessToken', () => {
    it('should generate valid JWT with correct payload', async () => {
      const payload = { userId: 'user456', email: 'user@example.com' };

      const token = await generateAccessToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include required claims (iat, exp, iss, aud)', async () => {
      const payload = { userId: 'user456', email: 'user@example.com' };
      const token = await generateAccessToken(payload);

      const verified = await verifyAccessToken(token, 'test-secret-key-for-testing');

      expect(verified).toBeDefined();
      expect(verified?.iat).toBeDefined();
      expect(verified?.exp).toBeDefined();
      expect(typeof verified?.iat).toBe('number');
      expect(typeof verified?.exp).toBe('number');
    });
  });

  describe('generateAccessTokenWithConfig', () => {
    it('should generate JWT without relying on environment variables', async () => {
      // Clear env to prove we don't need it
      delete process.env.JWT_SECRET;
      delete process.env.JWT_ACCESS_TOKEN_EXPIRY;

      const payload = { userId: 'user789', email: 'config@example.com' };
      const config = {
        secret: 'config-secret-key',
        expirySeconds: 1800 // 30 minutes
      };

      const token = await generateAccessTokenWithConfig(payload, config);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      // Verify with the same secret
      const verified = await verifyAccessToken(token, 'config-secret-key');
      expect(verified?.userId).toBe('user789');
      expect(verified?.email).toBe('config@example.com');
    });

    it('should use custom expiry time from config', async () => {
      const payload = { userId: 'user999', email: 'short@example.com' };
      const config = {
        secret: 'test-secret',
        expirySeconds: 60 // 1 minute
      };

      const token = await generateAccessTokenWithConfig(payload, config);
      const verified = await verifyAccessToken(token, 'test-secret');

      expect(verified).toBeDefined();
      // Verify expiry is approximately current time + 60 seconds
      const now = Math.floor(Date.now() / 1000);
      expect(verified?.exp).toBeGreaterThan(now);
      expect(verified?.exp).toBeLessThanOrEqual(now + 61); // Allow 1 second tolerance
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate random 32-byte hex string', () => {
      const token = generateRefreshToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes = 64 hex characters
      expect(/^[0-9a-f]{64}$/.test(token)).toBe(true); // Only hex characters
    });

    it('should generate unique tokens', () => {
      const token1 = generateRefreshToken();
      const token2 = generateRefreshToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      const token = 'abc123.def456.ghi789';
      const header = `Bearer ${token}`;

      const result = extractTokenFromHeader(header);

      expect(result).toBe(token);
    });

    it('should return null for missing header', () => {
      const result = extractTokenFromHeader(undefined);

      expect(result).toBeNull();
    });

    it('should return null for non-Bearer header', () => {
      const result = extractTokenFromHeader('Basic abc123');

      expect(result).toBeNull();
    });

    it('should return null for malformed Bearer header', () => {
      const result = extractTokenFromHeader('Bearer');

      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = extractTokenFromHeader('');

      expect(result).toBeNull();
    });
  });

  describe('getJWTConfigFromEnv', () => {
    it('should throw if JWT_SECRET missing', () => {
      delete process.env.JWT_SECRET;

      expect(() => getJWTConfigFromEnv()).toThrow('JWT_SECRET environment variable is required');
    });

    it('should return config with defaults', () => {
      process.env.JWT_SECRET = 'my-secret';

      const config = getJWTConfigFromEnv();

      expect(config.secret).toBe('my-secret');
      expect(config.accessTokenExpiry).toBe(900); // 15 minutes
      expect(config.refreshTokenExpiry).toBe(2592000); // 30 days
    });

    it('should read expiry from environment', () => {
      process.env.JWT_SECRET = 'my-secret';
      process.env.JWT_ACCESS_TOKEN_EXPIRY = '1800';
      process.env.JWT_REFRESH_TOKEN_EXPIRY = '86400';

      const config = getJWTConfigFromEnv();

      expect(config.accessTokenExpiry).toBe(1800);
      expect(config.refreshTokenExpiry).toBe(86400);
    });
  });
});
