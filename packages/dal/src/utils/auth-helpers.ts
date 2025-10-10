/**
 * Auth helper utilities
 * User entity factory and query builders for authentication operations
 */

import type { QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import type { UserEntity } from '../services/auth.service.js';

/**
 * Configuration for creating a user entity
 */
export interface CreateUserEntityConfig {
  readonly userId: string;
  readonly email: string;
  readonly username: string;
  readonly passwordHash: string;
  readonly salt: string;
  readonly emailVerificationToken?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Creates a user entity for DynamoDB storage
 * Factory function - constructs entity with proper key structure for single-table design
 *
 * @param config - User entity configuration
 * @returns UserEntity ready for DynamoDB
 *
 * @example
 * ```typescript
 * const entity = createUserEntity({
 *   userId: 'user-123',
 *   email: 'test@example.com',
 *   username: 'testuser',
 *   passwordHash: 'hashed-password',
 *   salt: 'salt-value',
 *   emailVerificationToken: 'verification-token',
 *   createdAt: '2025-10-10T00:00:00.000Z',
 *   updatedAt: '2025-10-10T00:00:00.000Z'
 * });
 * ```
 */
export const createUserEntity = (
  config: CreateUserEntityConfig
): UserEntity => {
  const {
    userId,
    email,
    username,
    passwordHash,
    salt,
    emailVerificationToken,
    createdAt,
    updatedAt
  } = config;

  return {
    // Primary key structure
    PK: `USER#${userId}`,
    SK: 'PROFILE',
    // GSI1: Email lookup
    GSI1PK: `EMAIL#${email}`,
    GSI1SK: `USER#${userId}`,
    // GSI2: Username lookup
    GSI2PK: `USERNAME#${username}`,
    GSI2SK: `USER#${userId}`,
    // GSI3: Handle lookup (normalized to lowercase)
    GSI3PK: `HANDLE#${username.toLowerCase()}`,
    GSI3SK: `USER#${userId}`,
    // User identity fields
    id: userId,
    email,
    username,
    emailVerified: false,
    createdAt,
    updatedAt,
    // Auth-specific fields
    passwordHash,
    salt,
    ...(emailVerificationToken && { emailVerificationToken }),
    // Profile fields with defaults
    fullName: undefined,
    bio: undefined,
    handle: username, // Default to username
    profilePictureUrl: undefined,
    profilePictureThumbnailUrl: undefined,
    // Social counts
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
    // Entity type
    entityType: 'USER'
  };
};

/**
 * Builds query for retrieving user by email
 * Uses GSI1 for efficient email lookup
 *
 * @param email - User email address
 * @param tableName - DynamoDB table name
 * @returns QueryCommandInput for user lookup by email
 *
 * @example
 * ```typescript
 * const query = buildUserByEmailQuery('test@example.com', 'users-table');
 * const result = await dynamoClient.send(new QueryCommand(query));
 * ```
 */
export const buildUserByEmailQuery = (
  email: string,
  tableName: string
): QueryCommandInput => ({
  TableName: tableName,
  IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :email',
  ExpressionAttributeValues: {
    ':email': `EMAIL#${email}`
  },
  Limit: 1
});

/**
 * Builds query for retrieving user by username
 * Uses GSI2 for efficient username lookup
 *
 * @param username - Username
 * @param tableName - DynamoDB table name
 * @returns QueryCommandInput for user lookup by username
 *
 * @example
 * ```typescript
 * const query = buildUserByUsernameQuery('testuser', 'users-table');
 * const result = await dynamoClient.send(new QueryCommand(query));
 * ```
 */
export const buildUserByUsernameQuery = (
  username: string,
  tableName: string
): QueryCommandInput => ({
  TableName: tableName,
  IndexName: 'GSI2',
  KeyConditionExpression: 'GSI2PK = :username',
  ExpressionAttributeValues: {
    ':username': `USERNAME#${username}`
  },
  Limit: 1
});

/**
 * Builds query for retrieving user by handle
 * Uses GSI3 for efficient handle lookup
 * Handle is normalized to lowercase for case-insensitive lookups
 *
 * @param handle - User handle
 * @param tableName - DynamoDB table name
 * @returns QueryCommandInput for user lookup by handle
 *
 * @example
 * ```typescript
 * const query = buildUserByHandleQuery('testhandle', 'users-table');
 * const result = await dynamoClient.send(new QueryCommand(query));
 * ```
 */
export const buildUserByHandleQuery = (
  handle: string,
  tableName: string
): QueryCommandInput => ({
  TableName: tableName,
  IndexName: 'GSI3',
  KeyConditionExpression: 'GSI3PK = :handle',
  ExpressionAttributeValues: {
    ':handle': `HANDLE#${handle.toLowerCase()}`
  },
  Limit: 1
});

/**
 * Builds query for retrieving refresh token
 * Uses GSI1 for efficient token lookup
 *
 * @param refreshToken - Refresh token value
 * @param tableName - DynamoDB table name
 * @returns QueryCommandInput for token lookup
 *
 * @example
 * ```typescript
 * const query = buildRefreshTokenQuery('token-123', 'users-table');
 * const result = await dynamoClient.send(new QueryCommand(query));
 * ```
 */
export const buildRefreshTokenQuery = (
  refreshToken: string,
  tableName: string
): QueryCommandInput => ({
  TableName: tableName,
  IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :token',
  ExpressionAttributeValues: {
    ':token': `REFRESH_TOKEN#${refreshToken}`
  },
  Limit: 1
});
