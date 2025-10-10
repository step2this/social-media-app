/**
 * Tests for auth helper utilities
 * User entity factory and query builders
 */

import { describe, it, expect } from 'vitest';
import type { QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import {
  createUserEntity,
  buildUserByEmailQuery,
  buildUserByUsernameQuery,
  buildUserByHandleQuery,
  buildRefreshTokenQuery,
  type CreateUserEntityConfig
} from './auth-helpers.js';

describe('createUserEntity', () => {
  const mockConfig: CreateUserEntityConfig = {
    userId: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hashed-password',
    salt: 'salt-value',
    emailVerificationToken: 'verification-token',
    createdAt: '2025-10-10T00:00:00.000Z',
    updatedAt: '2025-10-10T00:00:00.000Z'
  };

  it('should create user entity with all required fields', () => {
    const result = createUserEntity(mockConfig);

    expect(result.id).toBe('user-123');
    expect(result.email).toBe('test@example.com');
    expect(result.username).toBe('testuser');
    expect(result.passwordHash).toBe('hashed-password');
    expect(result.salt).toBe('salt-value');
    expect(result.emailVerificationToken).toBe('verification-token');
    expect(result.createdAt).toBe('2025-10-10T00:00:00.000Z');
    expect(result.updatedAt).toBe('2025-10-10T00:00:00.000Z');
  });

  it('should generate correct PK format', () => {
    const result = createUserEntity(mockConfig);
    expect(result.PK).toBe('USER#user-123');
  });

  it('should generate correct SK format', () => {
    const result = createUserEntity(mockConfig);
    expect(result.SK).toBe('PROFILE');
  });

  it('should generate correct GSI1PK for email lookup', () => {
    const result = createUserEntity(mockConfig);
    expect(result.GSI1PK).toBe('EMAIL#test@example.com');
  });

  it('should generate correct GSI1SK for user lookup', () => {
    const result = createUserEntity(mockConfig);
    expect(result.GSI1SK).toBe('USER#user-123');
  });

  it('should generate correct GSI2PK for username lookup', () => {
    const result = createUserEntity(mockConfig);
    expect(result.GSI2PK).toBe('USERNAME#testuser');
  });

  it('should generate correct GSI2SK for user lookup', () => {
    const result = createUserEntity(mockConfig);
    expect(result.GSI2SK).toBe('USER#user-123');
  });

  it('should generate correct GSI3PK for handle lookup (lowercase)', () => {
    const result = createUserEntity(mockConfig);
    expect(result.GSI3PK).toBe('HANDLE#testuser');
  });

  it('should normalize handle to lowercase', () => {
    const config = { ...mockConfig, username: 'TestUser' };
    const result = createUserEntity(config);
    expect(result.GSI3PK).toBe('HANDLE#testuser');
  });

  it('should generate correct GSI3SK for user lookup', () => {
    const result = createUserEntity(mockConfig);
    expect(result.GSI3SK).toBe('USER#user-123');
  });

  it('should set handle to username by default', () => {
    const result = createUserEntity(mockConfig);
    expect(result.handle).toBe('testuser');
  });

  it('should initialize emailVerified to false', () => {
    const result = createUserEntity(mockConfig);
    expect(result.emailVerified).toBe(false);
  });

  it('should initialize postsCount to 0', () => {
    const result = createUserEntity(mockConfig);
    expect(result.postsCount).toBe(0);
  });

  it('should initialize followersCount to 0', () => {
    const result = createUserEntity(mockConfig);
    expect(result.followersCount).toBe(0);
  });

  it('should initialize followingCount to 0', () => {
    const result = createUserEntity(mockConfig);
    expect(result.followingCount).toBe(0);
  });

  it('should set fullName to undefined by default', () => {
    const result = createUserEntity(mockConfig);
    expect(result.fullName).toBeUndefined();
  });

  it('should set bio to undefined by default', () => {
    const result = createUserEntity(mockConfig);
    expect(result.bio).toBeUndefined();
  });

  it('should set profilePictureUrl to undefined by default', () => {
    const result = createUserEntity(mockConfig);
    expect(result.profilePictureUrl).toBeUndefined();
  });

  it('should set profilePictureThumbnailUrl to undefined by default', () => {
    const result = createUserEntity(mockConfig);
    expect(result.profilePictureThumbnailUrl).toBeUndefined();
  });

  it('should set entityType to USER', () => {
    const result = createUserEntity(mockConfig);
    expect(result.entityType).toBe('USER');
  });

  it('should be a pure function (same input produces same output)', () => {
    const result1 = createUserEntity(mockConfig);
    const result2 = createUserEntity(mockConfig);
    expect(result1).toEqual(result2);
  });

  it('should handle user without emailVerificationToken', () => {
    const configWithoutToken = { ...mockConfig };
    delete (configWithoutToken as { emailVerificationToken?: string }).emailVerificationToken;

    const result = createUserEntity(configWithoutToken);
    expect(result.emailVerificationToken).toBeUndefined();
  });

  it('should handle different user IDs', () => {
    const config = { ...mockConfig, userId: 'different-user-456' };
    const result = createUserEntity(config);

    expect(result.PK).toBe('USER#different-user-456');
    expect(result.GSI1SK).toBe('USER#different-user-456');
    expect(result.GSI2SK).toBe('USER#different-user-456');
    expect(result.GSI3SK).toBe('USER#different-user-456');
  });

  it('should handle different emails', () => {
    const config = { ...mockConfig, email: 'different@test.com' };
    const result = createUserEntity(config);

    expect(result.GSI1PK).toBe('EMAIL#different@test.com');
    expect(result.email).toBe('different@test.com');
  });

  it('should handle different usernames', () => {
    const config = { ...mockConfig, username: 'different_user' };
    const result = createUserEntity(config);

    expect(result.GSI2PK).toBe('USERNAME#different_user');
    expect(result.GSI3PK).toBe('HANDLE#different_user');
    expect(result.username).toBe('different_user');
    expect(result.handle).toBe('different_user');
  });
});

describe('buildUserByEmailQuery', () => {
  const tableName = 'test-table';

  it('should build query with correct table name', () => {
    const result = buildUserByEmailQuery('test@example.com', tableName);
    expect(result.TableName).toBe('test-table');
  });

  it('should use GSI1 index', () => {
    const result = buildUserByEmailQuery('test@example.com', tableName);
    expect(result.IndexName).toBe('GSI1');
  });

  it('should build correct key condition expression', () => {
    const result = buildUserByEmailQuery('test@example.com', tableName);
    expect(result.KeyConditionExpression).toBe('GSI1PK = :email');
  });

  it('should build correct expression attribute values', () => {
    const result = buildUserByEmailQuery('test@example.com', tableName);
    expect(result.ExpressionAttributeValues).toEqual({
      ':email': 'EMAIL#test@example.com'
    });
  });

  it('should set limit to 1', () => {
    const result = buildUserByEmailQuery('test@example.com', tableName);
    expect(result.Limit).toBe(1);
  });

  it('should handle different emails', () => {
    const result = buildUserByEmailQuery('different@test.com', tableName);
    expect(result.ExpressionAttributeValues).toEqual({
      ':email': 'EMAIL#different@test.com'
    });
  });

  it('should be a pure function', () => {
    const result1 = buildUserByEmailQuery('test@example.com', tableName);
    const result2 = buildUserByEmailQuery('test@example.com', tableName);
    expect(result1).toEqual(result2);
  });
});

describe('buildUserByUsernameQuery', () => {
  const tableName = 'test-table';

  it('should build query with correct table name', () => {
    const result = buildUserByUsernameQuery('testuser', tableName);
    expect(result.TableName).toBe('test-table');
  });

  it('should use GSI2 index', () => {
    const result = buildUserByUsernameQuery('testuser', tableName);
    expect(result.IndexName).toBe('GSI2');
  });

  it('should build correct key condition expression', () => {
    const result = buildUserByUsernameQuery('testuser', tableName);
    expect(result.KeyConditionExpression).toBe('GSI2PK = :username');
  });

  it('should build correct expression attribute values', () => {
    const result = buildUserByUsernameQuery('testuser', tableName);
    expect(result.ExpressionAttributeValues).toEqual({
      ':username': 'USERNAME#testuser'
    });
  });

  it('should set limit to 1', () => {
    const result = buildUserByUsernameQuery('testuser', tableName);
    expect(result.Limit).toBe(1);
  });

  it('should handle different usernames', () => {
    const result = buildUserByUsernameQuery('different_user', tableName);
    expect(result.ExpressionAttributeValues).toEqual({
      ':username': 'USERNAME#different_user'
    });
  });

  it('should be a pure function', () => {
    const result1 = buildUserByUsernameQuery('testuser', tableName);
    const result2 = buildUserByUsernameQuery('testuser', tableName);
    expect(result1).toEqual(result2);
  });
});

describe('buildUserByHandleQuery', () => {
  const tableName = 'test-table';

  it('should build query with correct table name', () => {
    const result = buildUserByHandleQuery('testhandle', tableName);
    expect(result.TableName).toBe('test-table');
  });

  it('should use GSI3 index', () => {
    const result = buildUserByHandleQuery('testhandle', tableName);
    expect(result.IndexName).toBe('GSI3');
  });

  it('should build correct key condition expression', () => {
    const result = buildUserByHandleQuery('testhandle', tableName);
    expect(result.KeyConditionExpression).toBe('GSI3PK = :handle');
  });

  it('should normalize handle to lowercase', () => {
    const result = buildUserByHandleQuery('TestHandle', tableName);
    expect(result.ExpressionAttributeValues).toEqual({
      ':handle': 'HANDLE#testhandle'
    });
  });

  it('should set limit to 1', () => {
    const result = buildUserByHandleQuery('testhandle', tableName);
    expect(result.Limit).toBe(1);
  });

  it('should be a pure function', () => {
    const result1 = buildUserByHandleQuery('testhandle', tableName);
    const result2 = buildUserByHandleQuery('testhandle', tableName);
    expect(result1).toEqual(result2);
  });
});

describe('buildRefreshTokenQuery', () => {
  const tableName = 'test-table';

  it('should build query with correct table name', () => {
    const result = buildRefreshTokenQuery('token-123', tableName);
    expect(result.TableName).toBe('test-table');
  });

  it('should use GSI1 index', () => {
    const result = buildRefreshTokenQuery('token-123', tableName);
    expect(result.IndexName).toBe('GSI1');
  });

  it('should build correct key condition expression', () => {
    const result = buildRefreshTokenQuery('token-123', tableName);
    expect(result.KeyConditionExpression).toBe('GSI1PK = :token');
  });

  it('should build correct expression attribute values', () => {
    const result = buildRefreshTokenQuery('token-123', tableName);
    expect(result.ExpressionAttributeValues).toEqual({
      ':token': 'REFRESH_TOKEN#token-123'
    });
  });

  it('should set limit to 1', () => {
    const result = buildRefreshTokenQuery('token-123', tableName);
    expect(result.Limit).toBe(1);
  });

  it('should handle different tokens', () => {
    const result = buildRefreshTokenQuery('different-token', tableName);
    expect(result.ExpressionAttributeValues).toEqual({
      ':token': 'REFRESH_TOKEN#different-token'
    });
  });

  it('should be a pure function', () => {
    const result1 = buildRefreshTokenQuery('token-123', tableName);
    const result2 = buildRefreshTokenQuery('token-123', tableName);
    expect(result1).toEqual(result2);
  });
});
