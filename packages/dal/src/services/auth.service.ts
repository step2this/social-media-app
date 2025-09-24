/* eslint-disable max-lines-per-function, max-statements, complexity, functional/no-mixed-types, functional/prefer-immutable-types */
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  UserProfile,
  AuthTokens,
  RefreshTokenRequest,
  RefreshTokenResponse,
  UpdateUserProfileRequest
} from '@social-media-app/shared';
import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'crypto';

/**
 * User entity for DynamoDB single-table design
 */
export interface UserEntity {
  PK: string; // USER#<userId>
  SK: string; // PROFILE
  GSI1PK: string; // EMAIL#<email>
  GSI1SK: string; // USER#<userId>
  GSI2PK: string; // USERNAME#<username>
  GSI2SK: string; // USER#<userId>
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  salt: string;
  fullName?: string;
  bio?: string;
  avatarUrl?: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpiry?: string;
  createdAt: string;
  updatedAt: string;
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

    const userEntity: UserEntity = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      GSI1PK: `EMAIL#${request.email}`,
      GSI1SK: `USER#${userId}`,
      GSI2PK: `USERNAME#${request.username}`,
      GSI2SK: `USER#${userId}`,
      id: userId,
      email: request.email,
      username: request.username,
      passwordHash,
      salt,
      fullName: request.fullName,
      emailVerified: false,
      emailVerificationToken,
      createdAt: now,
      updatedAt: now,
      entityType: 'USER'
    };

    // Check if email already exists
    const existingEmailUser = await deps.dynamoClient.send(new QueryCommand({
      TableName: deps.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :email',
      ExpressionAttributeValues: {
        ':email': `EMAIL#${request.email}`
      },
      Limit: 1
    }));

    if (existingEmailUser.Items && existingEmailUser.Items.length > 0) {
      throw new Error('Email already registered');
    }

    // Check if username already exists
    const existingUsernameUser = await deps.dynamoClient.send(new QueryCommand({
      TableName: deps.tableName,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :username',
      ExpressionAttributeValues: {
        ':username': `USERNAME#${request.username}`
      },
      Limit: 1
    }));

    if (existingUsernameUser.Items && existingUsernameUser.Items.length > 0) {
      throw new Error('Username already taken');
    }

    // Create user
    await deps.dynamoClient.send(new PutCommand({
      TableName: deps.tableName,
      Item: userEntity,
      ConditionExpression: 'attribute_not_exists(PK)'
    }));

    return {
      user: {
        id: userId,
        email: request.email,
        username: request.username,
        fullName: request.fullName,
        emailVerified: false,
        createdAt: now
      },
      message: 'User registered successfully. Please check your email for verification.'
    };
  };

  /**
   * Login user
   */
  const login = async (request: Readonly<LoginRequest>): Promise<LoginResponse> => {
    // Get user by email
    const userQuery = await deps.dynamoClient.send(new QueryCommand({
      TableName: deps.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :email',
      ExpressionAttributeValues: {
        ':email': `EMAIL#${request.email}`
      },
      Limit: 1
    }));

    if (!userQuery.Items || userQuery.Items.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = userQuery.Items[0] as UserEntity;

    // Verify password
    const isValidPassword = deps.hashProvider.verifyPassword(
      request.password,
      user.passwordHash,
      user.salt
    );

    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const accessToken = await deps.jwtProvider.generateAccessToken({
      userId: user.id,
      email: user.email
    });

    const refreshTokenValue = deps.jwtProvider.generateRefreshToken();
    const refreshTokenId = deps.uuidProvider();
    const now = deps.timeProvider();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    // Store refresh token
    const refreshTokenEntity: RefreshTokenEntity = {
      PK: `USER#${user.id}`,
      SK: `REFRESH_TOKEN#${refreshTokenId}`,
      GSI1PK: `REFRESH_TOKEN#${refreshTokenValue}`,
      GSI1SK: `USER#${user.id}`,
      tokenId: refreshTokenId,
      hashedToken: refreshTokenValue,
      userId: user.id,
      deviceInfo: request.deviceInfo,
      expiresAt,
      createdAt: now,
      entityType: 'REFRESH_TOKEN'
    };

    await deps.dynamoClient.send(new PutCommand({
      TableName: deps.tableName,
      Item: refreshTokenEntity
    }));

    const userProfile: UserProfile = {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    const tokens: AuthTokens = {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: 900 // 15 minutes
    };

    return {
      user: userProfile,
      tokens
    };
  };

  /**
   * Refresh access token
   */
  const refreshToken = async (request: Readonly<RefreshTokenRequest>): Promise<RefreshTokenResponse> => {
    // Find refresh token
    const tokenQuery = await deps.dynamoClient.send(new QueryCommand({
      TableName: deps.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :token',
      ExpressionAttributeValues: {
        ':token': `REFRESH_TOKEN#${request.refreshToken}`
      },
      Limit: 1
    }));

    if (!tokenQuery.Items || tokenQuery.Items.length === 0) {
      throw new Error('Invalid refresh token');
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
      throw new Error('Refresh token expired');
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
      throw new Error('User not found');
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

    const tokens: AuthTokens = {
      accessToken,
      refreshToken: newRefreshTokenValue,
      expiresIn: 900 // 15 minutes
    };

    return { tokens };
  };

  /**
   * Get user profile by ID
   */
  const getUserById = async (userId: string): Promise<UserProfile | null> => {
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
      fullName: user.fullName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
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
    const tokenQuery = await deps.dynamoClient.send(new QueryCommand({
      TableName: deps.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :token',
      ExpressionAttributeValues: {
        ':token': `REFRESH_TOKEN#${refreshToken}`
      },
      Limit: 1
    }));

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
  const updateUserProfile = async (userId: string, updates: UpdateUserProfileRequest): Promise<UserProfile> => {
    // Get current user first
    const currentUser = await getUserById(userId);
    if (!currentUser) {
      throw new Error('User not found');
    }

    // Update user with simple field updates
    const now = deps.timeProvider();

    const updateExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    if (updates.fullName !== undefined) {
      updateExpression.push('#fullName = :fullName');
      expressionAttributeNames['#fullName'] = 'fullName';
      expressionAttributeValues[':fullName'] = updates.fullName;
    }

    if (updates.bio !== undefined) {
      updateExpression.push('#bio = :bio');
      expressionAttributeNames['#bio'] = 'bio';
      expressionAttributeValues[':bio'] = updates.bio;
    }

    if (updates.avatarUrl !== undefined) {
      updateExpression.push('#avatarUrl = :avatarUrl');
      expressionAttributeNames['#avatarUrl'] = 'avatarUrl';
      expressionAttributeValues[':avatarUrl'] = updates.avatarUrl;
    }

    // Always update the updatedAt field
    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = now;

    await deps.dynamoClient.send(new UpdateCommand({
      TableName: deps.tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE'
      },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues
    }));

    // Return updated user
    return {
      ...currentUser,
      ...updates,
      updatedAt: now
    };
  };

  return {
    register,
    login,
    refreshToken,
    getUserById,
    logout,
    updateUserProfile
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