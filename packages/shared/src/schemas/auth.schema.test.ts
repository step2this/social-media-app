import { describe, it, expect } from 'vitest';
import {
  EmailSchema,
  PasswordSchema,
  UsernameSchema,
  RegisterRequestSchema,
  LoginRequestSchema,
  RefreshTokenRequestSchema,
  AuthTokensSchema
} from './auth.schema.js';
import { UserSchema } from './user.schema.js';

describe('Authentication Schemas', () => {
  describe('EmailSchema', () => {
    it('should validate correct email', () => {
      const result = EmailSchema.safeParse('user@example.com');
      expect(result.success).toBe(true);
      expect(result.data).toBe('user@example.com');
    });

    it('should lowercase and trim email', () => {
      const result = EmailSchema.safeParse('  USER@EXAMPLE.COM  ');
      expect(result.success).toBe(true);
      expect(result.data).toBe('user@example.com');
    });

    it('should reject invalid email', () => {
      const result = EmailSchema.safeParse('invalid-email');
      expect(result.success).toBe(false);
      expect(result.error?.errors[0]?.message).toBe('Invalid email format');
    });

    it('should reject email exceeding max length', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = EmailSchema.safeParse(longEmail);
      expect(result.success).toBe(false);
      expect(result.error?.errors[0]?.message).toBe('Email must not exceed 255 characters');
    });
  });

  describe('PasswordSchema', () => {
    it('should validate strong password', () => {
      const result = PasswordSchema.safeParse('MyP@ssw0rd123');
      expect(result.success).toBe(true);
    });

    it('should reject password without uppercase', () => {
      const result = PasswordSchema.safeParse('myp@ssw0rd');
      expect(result.success).toBe(false);
      expect(result.error?.errors[0]?.message).toBe('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = PasswordSchema.safeParse('MYP@SSW0RD');
      expect(result.success).toBe(false);
      expect(result.error?.errors[0]?.message).toBe('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = PasswordSchema.safeParse('MyP@ssword');
      expect(result.success).toBe(false);
      expect(result.error?.errors[0]?.message).toBe('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = PasswordSchema.safeParse('MyPassword123');
      expect(result.success).toBe(false);
      expect(result.error?.errors[0]?.message).toBe('Password must contain at least one special character');
    });

    it('should reject password shorter than 8 characters', () => {
      const result = PasswordSchema.safeParse('MyP@ss1');
      expect(result.success).toBe(false);
      expect(result.error?.errors[0]?.message).toBe('Password must be at least 8 characters');
    });

    it('should reject password longer than 128 characters', () => {
      const longPassword = 'MyP@ssw0rd' + 'a'.repeat(120);
      const result = PasswordSchema.safeParse(longPassword);
      expect(result.success).toBe(false);
      expect(result.error?.errors[0]?.message).toBe('Password must not exceed 128 characters');
    });
  });

  describe('UsernameSchema', () => {
    it('should validate correct username', () => {
      const result = UsernameSchema.safeParse('john_doe123');
      expect(result.success).toBe(true);
      expect(result.data).toBe('john_doe123');
    });

    it('should lowercase and trim username', () => {
      const result = UsernameSchema.safeParse('  JOHN_DOE  ');
      expect(result.success).toBe(true);
      expect(result.data).toBe('john_doe');
    });

    it('should reject username with special characters', () => {
      const result = UsernameSchema.safeParse('john@doe');
      expect(result.success).toBe(false);
      expect(result.error?.errors[0]?.message).toBe('Username can only contain letters, numbers, and underscores');
    });

    it('should reject username shorter than 3 characters', () => {
      const result = UsernameSchema.safeParse('ab');
      expect(result.success).toBe(false);
      expect(result.error?.errors[0]?.message).toBe('Username must be at least 3 characters');
    });

    it('should reject username longer than 30 characters', () => {
      const result = UsernameSchema.safeParse('a'.repeat(31));
      expect(result.success).toBe(false);
      expect(result.error?.errors[0]?.message).toBe('Username must not exceed 30 characters');
    });
  });

  describe('RegisterRequestSchema', () => {
    it('should validate complete registration request', () => {
      const result = RegisterRequestSchema.safeParse({
        email: 'user@example.com',
        password: 'MyP@ssw0rd123',
        username: 'john_doe',
        fullName: 'John Doe'
      });
      expect(result.success).toBe(true);
    });

    it('should validate registration without optional fullName', () => {
      const result = RegisterRequestSchema.safeParse({
        email: 'user@example.com',
        password: 'MyP@ssw0rd123',
        username: 'john_doe'
      });
      expect(result.success).toBe(true);
    });

    it('should reject registration with invalid data', () => {
      const result = RegisterRequestSchema.safeParse({
        email: 'invalid',
        password: 'weak',
        username: 'ab'
      });
      expect(result.success).toBe(false);
      expect(result.error?.errors.length).toBeGreaterThan(0);
    });
  });

  describe('LoginRequestSchema', () => {
    it('should validate login request with email and password', () => {
      const result = LoginRequestSchema.safeParse({
        email: 'user@example.com',
        password: 'password123'
      });
      expect(result.success).toBe(true);
    });

    it('should validate login request with device info', () => {
      const result = LoginRequestSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
        deviceInfo: {
          userAgent: 'Mozilla/5.0',
          platform: 'Web'
        }
      });
      expect(result.success).toBe(true);
    });

    it('should reject login with empty password', () => {
      const result = LoginRequestSchema.safeParse({
        email: 'user@example.com',
        password: ''
      });
      expect(result.success).toBe(false);
      expect(result.error?.errors[0]?.message).toBe('Password is required');
    });
  });

  describe('RefreshTokenRequestSchema', () => {
    it('should validate refresh token request', () => {
      const result = RefreshTokenRequestSchema.safeParse({
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty refresh token', () => {
      const result = RefreshTokenRequestSchema.safeParse({
        refreshToken: ''
      });
      expect(result.success).toBe(false);
      expect(result.error?.errors[0]?.message).toBe('Refresh token is required');
    });
  });

  describe('UserSchema', () => {
    it('should validate complete user profile', () => {
      const result = UserSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        username: 'john_doe',
        fullName: 'John Doe',
        bio: 'Software developer',
        avatarUrl: 'https://example.com/avatar.jpg',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      });
      expect(result.success).toBe(true);
    });

    it('should validate profile without optional fields', () => {
      const result = UserSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        username: 'john_doe',
        emailVerified: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      });
      expect(result.success).toBe(true);
    });

    it('should reject profile with invalid UUID', () => {
      const result = UserSchema.safeParse({
        id: 'not-a-uuid',
        email: 'user@example.com',
        username: 'john_doe',
        emailVerified: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('AuthTokensSchema', () => {
    it('should validate auth tokens', () => {
      const result = AuthTokensSchema.safeParse({
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresIn: 900
      });
      expect(result.success).toBe(true);
    });

    it('should reject tokens with invalid expiresIn', () => {
      const result = AuthTokensSchema.safeParse({
        accessToken: 'token',
        refreshToken: 'token',
        expiresIn: -1
      });
      expect(result.success).toBe(false);
    });
  });
});