/* eslint-disable max-lines-per-function, max-statements, complexity, max-depth, functional/prefer-immutable-types */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAuthService, defaultHashProvider, type AuthServiceDependencies, type UserEntity, type RefreshTokenEntity } from './auth.service';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { RegisterRequest, LoginRequest, RefreshTokenRequest } from '@social-media-app/shared';

interface MockDynamoCommand {
  readonly constructor: { readonly name: string };
  readonly input: {
    readonly TableName?: string;
    readonly Item?: Record<string, unknown>;
    readonly Key?: Record<string, unknown>;
    readonly IndexName?: string;
    readonly KeyConditionExpression?: string;
    readonly ExpressionAttributeValues?: Record<string, unknown>;
    readonly Limit?: number;
    readonly ConditionExpression?: string;
    readonly UpdateExpression?: string;
    readonly ExpressionAttributeNames?: Record<string, unknown>;
  };
}

// Mock DynamoDB client with proper typing
const createMockDynamoClient = () => {
  const items = new Map<string, Record<string, unknown>>();
  const gsi1Items = new Map<string, Record<string, unknown>[]>();
  const gsi2Items = new Map<string, Record<string, unknown>[]>();

  const updateGSI1 = (item: Record<string, unknown>) => {
    const gsi1Key = item.GSI1PK as string;
    if (gsi1Key) {
      if (!gsi1Items.has(gsi1Key)) {
        gsi1Items.set(gsi1Key, []);
      }
      gsi1Items.get(gsi1Key)!.push(item);
    }
  };

  const updateGSI2 = (item: Record<string, unknown>) => {
    const gsi2Key = item.GSI2PK as string;
    if (gsi2Key) {
      if (!gsi2Items.has(gsi2Key)) {
        gsi2Items.set(gsi2Key, []);
      }
      gsi2Items.get(gsi2Key)!.push(item);
    }
  };

  const handlePutCommand = (command: MockDynamoCommand) => {
    const item = command.input.Item!;
    const putKey = `${item.PK as string}#${item.SK as string}`;

    // Check condition expression for PutCommand
    if (command.input.ConditionExpression === 'attribute_not_exists(PK)' && items.has(putKey)) {
      throw new Error('ConditionalCheckFailedException');
    }

    items.set(putKey, item);
    updateGSI1(item);
    updateGSI2(item);
    return Promise.resolve({});
  };

  const handleGetCommand = (command: MockDynamoCommand) => {
    const key = command.input.Key!;
    const getKey = `${key.PK as string}#${key.SK as string}`;
    const item = items.get(getKey);
    return Promise.resolve({ Item: item });
  };

  const handleQueryCommand = (command: MockDynamoCommand) => {
    const values = command.input.ExpressionAttributeValues!;

    if (command.input.IndexName === 'GSI1') {
      const gsi1Key = values[':email'] as string || values[':token'] as string;
      const gsi1Results = gsi1Items.get(gsi1Key) || [];
      return Promise.resolve({ Items: gsi1Results });
    }

    if (command.input.IndexName === 'GSI2') {
      const gsi2Key = values[':username'] as string;
      const gsi2Results = gsi2Items.get(gsi2Key) || [];
      return Promise.resolve({ Items: gsi2Results });
    }

    return Promise.resolve({ Items: [] });
  };

  const handleUpdateCommand = (command: MockDynamoCommand) => {
    const key = command.input.Key!;
    const updateKey = `${key.PK as string}#${key.SK as string}`;
    const existingItem = items.get(updateKey);

    if (existingItem) {
      const updatedItem = { ...existingItem };
      const values = command.input.ExpressionAttributeValues!;

      // Simple update simulation based on known patterns
      if (values[':token']) {
        updatedItem.hashedToken = values[':token'];
      }
      if (values[':gsi1pk']) {
        // Remove from old GSI1
        const oldGSI1Key = existingItem.GSI1PK as string;
        if (gsi1Items.has(oldGSI1Key)) {
          const itemsArray = gsi1Items.get(oldGSI1Key)!;
          const index = itemsArray.findIndex(item =>
            item.PK === existingItem.PK && item.SK === existingItem.SK
          );
          if (index !== -1) {
            itemsArray.splice(index, 1);
            if (itemsArray.length === 0) {
              gsi1Items.delete(oldGSI1Key);
            }
          }
        }

        // Add to new GSI1
        updatedItem.GSI1PK = values[':gsi1pk'];
        const newGSI1Key = values[':gsi1pk'] as string;
        if (!gsi1Items.has(newGSI1Key)) {
          gsi1Items.set(newGSI1Key, []);
        }
        gsi1Items.get(newGSI1Key)!.push(updatedItem);
      }
      if (values[':updatedAt']) {
        updatedItem.updatedAt = values[':updatedAt'];
      }

      items.set(updateKey, updatedItem);
    }
    return Promise.resolve({});
  };

  const handleDeleteCommand = (command: MockDynamoCommand) => {
    const key = command.input.Key!;
    const deleteKey = `${key.PK as string}#${key.SK as string}`;
    const deletedItem = items.get(deleteKey);

    if (deletedItem) {
      items.delete(deleteKey);

      // Remove from GSI1
      const gsi1Key = deletedItem.GSI1PK as string;
      if (gsi1Key && gsi1Items.has(gsi1Key)) {
        const gsi1Array = gsi1Items.get(gsi1Key)!;
        const index = gsi1Array.findIndex(item =>
          item.PK === deletedItem.PK && item.SK === deletedItem.SK
        );
        if (index !== -1) {
          gsi1Array.splice(index, 1);
          if (gsi1Array.length === 0) {
            gsi1Items.delete(gsi1Key);
          }
        }
      }
    }
    return Promise.resolve({});
  };

  return {
    send: vi.fn().mockImplementation((command: MockDynamoCommand) => {
      const commandName = command.constructor.name;

      switch (commandName) {
        case 'PutCommand':
          return handlePutCommand(command);
        case 'GetCommand':
          return handleGetCommand(command);
        case 'QueryCommand':
          return handleQueryCommand(command);
        case 'UpdateCommand':
          return handleUpdateCommand(command);
        case 'DeleteCommand':
          return handleDeleteCommand(command);
        default:
          return Promise.resolve({});
      }
    }),

    // Test helpers
    _getItems: () => items,
    _clear: () => {
      items.clear();
      gsi1Items.clear();
      gsi2Items.clear();
    }
  } as unknown as DynamoDBDocumentClient & {
    _getItems: () => Map<string, Record<string, unknown>>;
    _clear: () => void
  };
};

describe('AuthService', () => {
  let mockDynamoClient: DynamoDBDocumentClient & {
    _getItems: () => Map<string, Record<string, unknown>>;
    _clear: () => void
  };
  let mockJwtProvider: AuthServiceDependencies['jwtProvider'];
  let authService: ReturnType<typeof createAuthService>;

  beforeEach(() => {
    mockDynamoClient = createMockDynamoClient();

    mockJwtProvider = {
      generateAccessToken: vi.fn().mockResolvedValue('mock-access-token'),
      generateRefreshToken: vi.fn(() => 'mock-refresh-token'),
      verifyRefreshToken: vi.fn().mockResolvedValue({ userId: 'test-uuid-123' })
    };

    authService = createAuthService({
      dynamoClient: mockDynamoClient,
      tableName: 'test-table',
      timeProvider: () => '2024-01-01T00:00:00.000Z',
      uuidProvider: () => 'test-uuid-123',
      jwtProvider: mockJwtProvider,
      hashProvider: defaultHashProvider
    });
  });

  describe('register', () => {
    const validRegisterRequest: RegisterRequest = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      username: 'testuser'
    };

    it('should successfully register a new user', async () => {
      const result = await authService.register(validRegisterRequest);

      expect(result).toEqual({
        user: {
          id: 'test-uuid-123',
          email: 'test@example.com',
          username: 'testuser',
          emailVerified: false,
          createdAt: '2024-01-01T00:00:00.000Z'
        },
        message: 'User registered successfully. Welcome!',
        tokens: {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          expiresIn: 900
        }
      });

      // Verify user was stored in DynamoDB
      const items = mockDynamoClient._getItems();
      const userKey = 'USER#test-uuid-123#PROFILE';
      expect(items.has(userKey)).toBe(true);

      const storedUser = items.get(userKey) as UserEntity;
      expect(storedUser.email).toBe('test@example.com');
      expect(storedUser.username).toBe('testuser');
      expect(storedUser.passwordHash).toBeDefined();
      expect(storedUser.salt).toBeDefined();
      expect(storedUser.emailVerified).toBe(false);
    });

    it('should reject registration with existing email', async () => {
      // Register first user
      await authService.register(validRegisterRequest);

      // Try to register with same email
      const duplicateRequest = {
        ...validRegisterRequest,
        username: 'differentuser'
      };

      await expect(authService.register(duplicateRequest))
        .rejects.toThrow('Email already registered');
    });

    it('should reject registration with existing username', async () => {
      // Register first user
      await authService.register(validRegisterRequest);

      // Try to register with same username
      const duplicateRequest = {
        ...validRegisterRequest,
        email: 'different@example.com'
      };

      await expect(authService.register(duplicateRequest))
        .rejects.toThrow('Username already taken');
    });
  });

  describe('login', () => {
    const registerRequest: RegisterRequest = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      username: 'testuser'
    };

    beforeEach(async () => {
      await authService.register(registerRequest);
    });

    it('should successfully login with valid credentials', async () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        deviceInfo: {
          userAgent: 'Mozilla/5.0',
          platform: 'Web'
        }
      };

      const result = await authService.login(loginRequest);

      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens.accessToken).toBe('mock-access-token');
      expect(result.tokens.refreshToken).toBe('mock-refresh-token');

      expect(mockJwtProvider.generateAccessToken).toHaveBeenCalledWith({
        userId: 'test-uuid-123',
        email: 'test@example.com'
      });
    });

    it('should reject login with invalid email', async () => {
      const loginRequest: LoginRequest = {
        email: 'invalid@example.com',
        password: 'TestPassword123!'
      };

      await expect(authService.login(loginRequest))
        .rejects.toThrow('Invalid email or password');
    });

    it('should reject login with invalid password', async () => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      await expect(authService.login(loginRequest))
        .rejects.toThrow('Invalid email or password');
    });
  });

  describe('refreshToken', () => {
    let refreshToken: string;

    beforeEach(async () => {
      await authService.register({
        email: 'test@example.com',
        password: 'TestPassword123!',
        username: 'testuser'
      });

      const loginResult = await authService.login({
        email: 'test@example.com',
        password: 'TestPassword123!'
      });

      refreshToken = loginResult.tokens.refreshToken;
    });

    it('should successfully refresh token with valid refresh token', async () => {
      const request: RefreshTokenRequest = {
        refreshToken
      };

      const result = await authService.refreshToken(request);

      expect(result.tokens.accessToken).toBe('mock-access-token');
      expect(result.tokens.refreshToken).toBe('mock-refresh-token');
    });

    it('should reject refresh with invalid token', async () => {
      const request: RefreshTokenRequest = {
        refreshToken: 'invalid-token'
      };

      await expect(authService.refreshToken(request))
        .rejects.toThrow('Invalid refresh token');
    });

    it('should reject refresh with expired token', async () => {
      // Create an expired token
      const expiredTokenEntity: RefreshTokenEntity = {
        PK: 'USER#test-uuid-123',
        SK: 'REFRESH_TOKEN#expired-token',
        GSI1PK: 'REFRESH_TOKEN#expired-refresh-token',
        GSI1SK: 'USER#test-uuid-123',
        tokenId: 'expired-token',
        hashedToken: 'expired-refresh-token',
        userId: 'test-uuid-123',
        expiresAt: '2023-01-01T00:00:00.000Z', // Past date
        createdAt: '2023-01-01T00:00:00.000Z',
        entityType: 'REFRESH_TOKEN'
      };

      // Add expired token using proper command structure
      await mockDynamoClient.send({
        constructor: { name: 'PutCommand' },
        input: {
          TableName: 'test-table',
          Item: expiredTokenEntity
        }
      } as MockDynamoCommand);

      const request: RefreshTokenRequest = {
        refreshToken: 'expired-refresh-token'
      };

      await expect(authService.refreshToken(request))
        .rejects.toThrow('Refresh token expired');
    });
  });

  describe('getUserById', () => {
    beforeEach(async () => {
      await authService.register({
        email: 'test@example.com',
        password: 'TestPassword123!',
        username: 'testuser'
      });
    });

    it('should return user profile for valid user ID', async () => {
      const result = await authService.getUserById('test-uuid-123');

      expect(result?.email).toBe('test@example.com');
      expect(result?.username).toBe('testuser');
    });

    it('should return null for non-existent user ID', async () => {
      const result = await authService.getUserById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    let refreshToken: string;

    beforeEach(async () => {
      await authService.register({
        email: 'test@example.com',
        password: 'TestPassword123!',
        username: 'testuser'
      });

      const loginResult = await authService.login({
        email: 'test@example.com',
        password: 'TestPassword123!'
      });

      refreshToken = loginResult.tokens.refreshToken;
    });

    it('should successfully logout and invalidate refresh token', async () => {
      await authService.logout(refreshToken, 'test-uuid-123');

      // Verify refresh token was deleted
      const items = mockDynamoClient._getItems();
      const refreshTokenKey = 'USER#test-uuid-123#REFRESH_TOKEN#test-uuid-123';
      expect(items.has(refreshTokenKey)).toBe(false);
    });

    it('should not error when logging out with invalid token', async () => {
      await expect(authService.logout('invalid-token', 'test-uuid-123'))
        .resolves.toBeUndefined();
    });
  });

  describe('defaultHashProvider', () => {
    it('should hash and verify passwords correctly', () => {
      const password = 'TestPassword123!';
      const salt = defaultHashProvider.generateSalt();
      const hash = defaultHashProvider.hashPassword(password, salt);

      expect(defaultHashProvider.verifyPassword(password, hash, salt)).toBe(true);
      expect(defaultHashProvider.verifyPassword('WrongPassword', hash, salt)).toBe(false);
    });

    it('should generate unique salts', () => {
      const salt1 = defaultHashProvider.generateSalt();
      const salt2 = defaultHashProvider.generateSalt();

      expect(salt1).not.toBe(salt2);
      expect(salt1.length).toBe(64); // 32 bytes = 64 hex chars
      expect(salt2.length).toBe(64);
    });
  });
});