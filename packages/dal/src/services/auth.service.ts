/* eslint-disable max-lines-per-function, max-statements, complexity, functional/no-mixed-types, functional/prefer-immutable-types */
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  User,
  RefreshTokenRequest,
  RefreshTokenResponse
} from '@social-media-app/shared';
import type {
  UpdateProfileWithHandleRequest
} from '@social-media-app/shared';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError
} from '@social-media-app/shared/errors';
import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'crypto';
import {
  calculateRefreshTokenExpiry,
  createRefreshTokenEntity,
  createAuthTokensResponse,
  createUserEntity,
  buildUserByEmailQuery,
  buildUserByUsernameQuery,
  buildRefreshTokenQuery,
  buildUpdateExpressionFromObject
} from '../utils/index.js';

/**
 * User entity for DynamoDB single-table design
 * Combines User identity fields with Profile presentation fields for storage
 */
export interface UserEntity {
  PK: string; // USER#<userId>
  SK: string; // PROFILE
  GSI1PK: string; // EMAIL#<email>
  GSI1SK: string; // USER#<userId>
  GSI2PK: string; // USERNAME#<username>
  GSI2SK: string; // USER#<userId>
  GSI3PK?: string; // HANDLE#<handle>
  GSI3SK?: string; // USER#<userId>
  // User identity fields
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  // Auth-specific fields
  passwordHash: string;
  salt: string;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpiry?: string;
  // Profile presentation fields
  fullName?: string;
  bio?: string;
  handle?: string;
  profilePictureUrl?: string;
  profilePictureThumbnailUrl?: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  entityType: 'USER';
}

/**
 * Refresh token entity for DynamoDB
 */
export interface RefreshTokenEntity {
  PK: string; // USER#<userId>
  SK: string; // REFRESH_TOKEN#<tokenId>
  GSI1PK: string; // REFRESH_TOKEN#<hashedToken>
  GSI1SK: string; // USER#<userId>
  tokenId: string;
  hashedToken: string;
  userId: string;
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
  };
  expiresAt: string;
  createdAt: string;
  entityType: 'REFRESH_TOKEN';
}

/**
 * Dependencies for the auth service
 */
export interface AuthServiceDependencies {
  readonly dynamoClient: DynamoDBDocumentClient;
  readonly tableName: string;
  readonly timeProvider: () => string;
  readonly uuidProvider: () => string;
  readonly jwtProvider: {
    readonly generateAccessToken: (payload: Readonly<{ userId: string; email: string }>) => Promise<string>;
    readonly generateRefreshToken: () => string;
    readonly verifyRefreshToken: (token: string) => Promise<Readonly<{ userId: string }> | null>;
  };
  readonly hashProvider: {
    readonly hashPassword: (password: string, salt: string) => string;
    readonly generateSalt: () => string;
    readonly verifyPassword: (password: string, hash: string, salt: string) => boolean;
  };
}

/**
 * Create auth service with dependencies
 */
export const createAuthService = (deps: Readonly<AuthServiceDependencies>) => {
  /**
   * Register a new user
   */
  const register = async (request: Readonly<RegisterRequest>): Promise<RegisterResponse> => {
    const userId = deps.uuidProvider();
    const now = deps.timeProvider();
    const salt = deps.hashProvider.generateSalt();
    const passwordHash = deps.hashProvider.hashPassword(request.password, salt);
    const emailVerificationToken = deps.jwtProvider.generateRefreshToken();

    // Create user entity using factory
    const userEntity = createUserEntity({
      userId,
      email: request.email,
      username: request.username,
      passwordHash,
      salt,
      emailVerificationToken,
      createdAt: now,
      updatedAt: now
    });

    // Check if email already exists
    const existingEmailUser = await deps.dynamoClient.send(
      new QueryCommand(buildUserByEmailQuery(request.email, deps.tableName))
    );

    if (existingEmailUser.Items && existingEmailUser.Items.length > 0) {
      throw new ConflictError(
        'Email already registered',
        'email',
        request.email
      );
    }

    // Check if username already exists
    const existingUsernameUser = await deps.dynamoClient.send(
      new QueryCommand(buildUserByUsernameQuery(request.username, deps.tableName))
    );

    if (existingUsernameUser.Items && existingUsernameUser.Items.length > 0) {
      throw new ConflictError(
        'Username already taken',
        'username',
        request.username
      );
    }

    // Create user
    await deps.dynamoClient.send(new PutCommand({
      TableName: deps.tableName,
      Item: userEntity,
      ConditionExpression: 'attribute_not_exists(PK)'
    }));

    // Generate tokens for auto-login after registration
    const accessToken = await deps.jwtProvider.generateAccessToken({
      userId,
      email: request.email
    });

    const refreshTokenValue = deps.jwtProvider.generateRefreshToken();
    const refreshTokenId = deps.uuidProvider();
    const expiresAt = calculateRefreshTokenExpiry(30); // 30 days

    // Store refresh token using factory
    const refreshTokenEntity = createRefreshTokenEntity({
      userId,
      tokenId: refreshTokenId,
      refreshTokenValue,
      expiresAt,
      createdAt: now
    });

    await deps.dynamoClient.send(new PutCommand({
      TableName: deps.tableName,
      Item: refreshTokenEntity
    }));

    const tokens = createAuthTokensResponse(accessToken, refreshTokenValue);

    return {
      user: {
        id: userId,
        email: request.email,
        username: request.username,
        emailVerified: false,
        createdAt: now
      },
      message: 'User registered successfully. Welcome!',
      tokens // Include tokens for auto-login
    };
  };

  /**
   * Login user
   */
  const login = async (request: Readonly<LoginRequest>): Promise<LoginResponse> => {
    // Get user by email
    const userQuery = await deps.dynamoClient.send(
      new QueryCommand(buildUserByEmailQuery(request.email, deps.tableName))
    );

    if (!userQuery.Items || userQuery.Items.length === 0) {
      throw new UnauthorizedError(
        'Invalid email or password',
        'invalid_credentials'
      );
    }

    const user = userQuery.Items[0] as UserEntity;

    // Verify password
    const isValidPassword = deps.hashProvider.verifyPassword(
      request.password,
      user.passwordHash,
      user.salt
    );

    if (!isValidPassword) {
      throw new UnauthorizedError(
        'Invalid email or password',
        'invalid_credentials'
      );
    }

    // Generate tokens
    const accessToken = await deps.jwtProvider.generateAccessToken({
      userId: user.id,
      email: user.email
    });

    const refreshTokenValue = deps.jwtProvider.generateRefreshToken();
    const refreshTokenId = deps.uuidProvider();
    const now = deps.timeProvider();
    const expiresAt = calculateRefreshTokenExpiry(30); // 30 days

    // Store refresh token using factory
    const refreshTokenEntity = createRefreshTokenEntity({
      userId: user.id,
      tokenId: refreshTokenId,
      refreshTokenValue,
      deviceInfo: request.deviceInfo,
      expiresAt,
      createdAt: now
    });

    await deps.dynamoClient.send(new PutCommand({
      TableName: deps.tableName,
      Item: refreshTokenEntity
    }));

    const tokens = createAuthTokensResponse(accessToken, refreshTokenValue);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        emailVerified: user.emailVerified
      },
      tokens
    };
  };

  /**
   * Refresh access token
   */
  const refreshToken = async (request: Readonly<RefreshTokenRequest>): Promise<RefreshTokenResponse> => {
    // Debug logging
    console.log('🔍 Looking up refresh token:', {
      tokenLength: request.refreshToken?.length,
      tokenPreview: request.refreshToken?.substring(0, 20) + '...',
      queryKey: `REFRESH_TOKEN#${request.refreshToken?.substring(0, 20)}...`
    });

    // Find refresh token
    const tokenQuery = await deps.dynamoClient.send(
      new QueryCommand(buildRefreshTokenQuery(request.refreshToken, deps.tableName))
    );

    console.log('🔍 Query result:', {
      itemsFound: tokenQuery.Items?.length || 0
    });

    if (!tokenQuery.Items || tokenQuery.Items.length === 0) {
      throw new UnauthorizedError(
        'Invalid refresh token',
        'invalid_token'
      );
    }

    const tokenEntity = tokenQuery.Items[0] as RefreshTokenEntity;

    // Check if token is expired
    if (new Date(tokenEntity.expiresAt) < new Date()) {
      // Delete expired token
      await deps.dynamoClient.send(new DeleteCommand({
        TableName: deps.tableName,
        Key: {
          PK: tokenEntity.PK,
          SK: tokenEntity.SK
        }
      }));
      throw new UnauthorizedError(
        'Refresh token expired',
        'token_expired'
      );
    }

    // Get user
    const user = await deps.dynamoClient.send(new GetCommand({
      TableName: deps.tableName,
      Key: {
        PK: `USER#${tokenEntity.userId}`,
        SK: 'PROFILE'
      }
    }));

    if (!user.Item) {
      throw new NotFoundError('User', tokenEntity.userId);
    }

    const userEntity = user.Item as UserEntity;

    // Generate new access token
    const accessToken = await deps.jwtProvider.generateAccessToken({
      userId: userEntity.id,
      email: userEntity.email
    });

    // Generate new refresh token
    const newRefreshTokenValue = deps.jwtProvider.generateRefreshToken();
    const now = deps.timeProvider();

    // Update refresh token
    await deps.dynamoClient.send(new UpdateCommand({
      TableName: deps.tableName,
      Key: {
        PK: tokenEntity.PK,
        SK: tokenEntity.SK
      },
      UpdateExpression: 'SET hashedToken = :token, GSI1PK = :gsi1pk, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':token': newRefreshTokenValue,
        ':gsi1pk': `REFRESH_TOKEN#${newRefreshTokenValue}`,
        ':updatedAt': now
      }
    }));

    const tokens = createAuthTokensResponse(accessToken, newRefreshTokenValue);

    return { tokens };
  };

  /**
   * Get user profile by ID
   */
  const getUserById = async (userId: string): Promise<User | null> => {
    const result = await deps.dynamoClient.send(new GetCommand({
      TableName: deps.tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE'
      }
    }));

    if (!result.Item) {
      return null;
    }

    const user = result.Item as UserEntity;
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  };

  /**
   * Logout user by invalidating refresh token
   */
  const logout = async (refreshToken: string, userId: string): Promise<void> => {
    // Find and delete the refresh token
    const tokenQuery = await deps.dynamoClient.send(
      new QueryCommand(buildRefreshTokenQuery(refreshToken, deps.tableName))
    );

    if (tokenQuery.Items && tokenQuery.Items.length > 0) {
      const tokenEntity = tokenQuery.Items[0] as RefreshTokenEntity;

      // Verify token belongs to user
      if (tokenEntity.userId === userId) {
        await deps.dynamoClient.send(new DeleteCommand({
          TableName: deps.tableName,
          Key: {
            PK: tokenEntity.PK,
            SK: tokenEntity.SK
          }
        }));
      }
    }
  };

  /**
   * Update user profile (minimal implementation for TDD)
   */
  const updateUser = async (userId: string, updates: UpdateProfileWithHandleRequest): Promise<User> => {
    // Get current user first
    const currentUser = await getUserById(userId);
    if (!currentUser) {
      throw new NotFoundError('User', userId);
    }

    // Build update expression using utility
    const now = deps.timeProvider();
    const updateData = {
      ...updates,
      updatedAt: now
    };

    const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } =
      buildUpdateExpressionFromObject(updateData);

    await deps.dynamoClient.send(new UpdateCommand({
      TableName: deps.tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE'
      },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues
    }));

    // Return updated user with only User identity fields
    return {
      ...currentUser,
      updatedAt: now
    };
  };

  return {
    register,
    login,
    refreshToken,
    getUserById,
    logout,
    updateUser
  };
};

/**
 * Default hash provider using Node.js crypto
 */
export const defaultHashProvider = {
  hashPassword: (password: string, salt: string): string =>
    pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex'),
  generateSalt: (): string =>
    randomBytes(32).toString('hex'),
  verifyPassword: (password: string, hash: string, salt: string): boolean => {
    const hashBuffer = Buffer.from(hash, 'hex');
    const verifyBuffer = pbkdf2Sync(password, salt, 100000, 64, 'sha256');
    return timingSafeEqual(hashBuffer, verifyBuffer);
  }
};

/**
 * Default auth service factory
 */
export const createDefaultAuthService = (
  dynamoClient: DynamoDBDocumentClient,
  tableName: string,
  jwtProvider: Readonly<AuthServiceDependencies['jwtProvider']>
) =>
  createAuthService({
    dynamoClient,
    tableName,
    timeProvider: () => new Date().toISOString(),
    uuidProvider: () => crypto.randomUUID(),
    jwtProvider,
    hashProvider: defaultHashProvider
  });
