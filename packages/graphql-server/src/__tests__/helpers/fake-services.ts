/**
 * Fake Service Implementations for Auth Use Case Testing
 *
 * Provides in-memory implementations of auth and profile services
 * for testing without mocks.
 *
 * Principles:
 * ✅ No mocks or spies - real implementations with in-memory storage
 * ✅ Behavioral testing - services behave like real implementations
 * ✅ Type-safe throughout
 * ✅ Stateful - can test sequences of operations
 *
 * Benefits over mocks:
 * - Test realistic workflows (register → login → logout)
 * - Catch integration issues between use cases
 * - More maintainable (no mock setup/teardown)
 * - Better error simulation (realistic error paths)
 */

import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * In-memory user storage
 */
interface StoredUser {
  id: string;
  email: string;
  password: string; // In real app, this would be hashed
  username: string;
  handle: string;
  fullName: string | null;
  bio: string | null;
  profilePictureUrl: string | null;
  profilePictureThumbnailUrl: string | null;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  createdAt: string;
  updatedAt: string;
  emailVerified: boolean;
}

/**
 * In-memory token storage
 */
interface StoredToken {
  refreshToken: string;
  userId: string;
  expiresAt: number; // Unix timestamp
}

/**
 * FakeAuthService - In-memory auth service for testing
 *
 * Maintains user and token storage, validates credentials, etc.
 */
export class FakeAuthService {
  private users: Map<string, StoredUser> = new Map();
  private usersByEmail: Map<string, string> = new Map(); // email -> userId
  private usersByUsername: Map<string, string> = new Map(); // username -> userId
  private tokens: Map<string, StoredToken> = new Map(); // refreshToken -> token data
  private userIdCounter = 1;

  /**
   * Register a new user
   */
  async register(input: {
    email: string;
    password: string;
    username: string;
  }): Promise<{
    user: { id: string };
    tokens?: { accessToken: string; refreshToken: string };
  }> {
    // Check if email already exists
    if (this.usersByEmail.has(input.email)) {
      throw new Error('Email already registered');
    }

    // Check if username already taken
    if (this.usersByUsername.has(input.username)) {
      throw new Error('Username already taken');
    }

    // Create user
    const userId = `user-${this.userIdCounter++}`;
    const user: StoredUser = {
      id: userId,
      email: input.email,
      password: input.password, // In real app: hash password
      username: input.username,
      handle: `@${input.username}`,
      fullName: null,
      bio: null,
      profilePictureUrl: null,
      profilePictureThumbnailUrl: null,
      postsCount: 0,
      followersCount: 0,
      followingCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      emailVerified: false,
    };

    // Store user
    this.users.set(userId, user);
    this.usersByEmail.set(input.email, userId);
    this.usersByUsername.set(input.username, userId);

    // Generate tokens
    const accessToken = `access_${userId}_${Date.now()}`;
    const refreshToken = `refresh_${userId}_${Date.now()}`;

    // Store refresh token
    this.tokens.set(refreshToken, {
      refreshToken,
      userId,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return {
      user: { id: userId },
      tokens: { accessToken, refreshToken },
    };
  }

  /**
   * Login user with email and password
   */
  async login(input: {
    email: string;
    password: string;
  }): Promise<{
    user: { id: string };
    tokens: { accessToken: string; refreshToken: string };
  }> {
    // Find user by email
    const userId = this.usersByEmail.get(input.email);
    if (!userId) {
      throw new Error('Invalid email or password');
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check password
    if (user.password !== input.password) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const accessToken = `access_${userId}_${Date.now()}`;
    const refreshToken = `refresh_${userId}_${Date.now()}`;

    // Store refresh token
    this.tokens.set(refreshToken, {
      refreshToken,
      userId,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return {
      user: { id: userId },
      tokens: { accessToken, refreshToken },
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(input: {
    refreshToken: string;
  }): Promise<{
    tokens: { accessToken: string; refreshToken: string };
  }> {
    // Find token
    const tokenData = this.tokens.get(input.refreshToken);
    if (!tokenData) {
      throw new Error('Invalid refresh token');
    }

    // Check expiration
    if (tokenData.expiresAt < Date.now()) {
      this.tokens.delete(input.refreshToken);
      throw new Error('Refresh token expired');
    }

    // Generate new tokens
    const accessToken = `access_${tokenData.userId}_${Date.now()}`;
    const newRefreshToken = `refresh_${tokenData.userId}_${Date.now()}`;

    // Delete old token, store new one
    this.tokens.delete(input.refreshToken);
    this.tokens.set(newRefreshToken, {
      refreshToken: newRefreshToken,
      userId: tokenData.userId,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });

    return {
      tokens: { accessToken, refreshToken: newRefreshToken },
    };
  }

  /**
   * Get userId from refresh token (helper for tests)
   */
  getUserIdFromToken(refreshToken: string): string | undefined {
    return this.tokens.get(refreshToken)?.userId;
  }

  /**
   * Clear all data (for test cleanup)
   */
  clear(): void {
    this.users.clear();
    this.usersByEmail.clear();
    this.usersByUsername.clear();
    this.tokens.clear();
    this.userIdCounter = 1;
  }

  /**
   * Seed a user (helper for tests)
   */
  seedUser(user: Partial<StoredUser> & { email: string; password: string; username: string }): StoredUser {
    const userId = user.id || `user-${this.userIdCounter++}`;
    const fullUser: StoredUser = {
      id: userId,
      handle: user.handle || `@${user.username}`,
      fullName: user.fullName || null,
      bio: user.bio || null,
      profilePictureUrl: user.profilePictureUrl || null,
      profilePictureThumbnailUrl: user.profilePictureThumbnailUrl || null,
      postsCount: user.postsCount || 0,
      followersCount: user.followersCount || 0,
      followingCount: user.followingCount || 0,
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString(),
      emailVerified: user.emailVerified || false,
      ...user,
    };

    this.users.set(userId, fullUser);
    this.usersByEmail.set(user.email, userId);
    this.usersByUsername.set(user.username, userId);

    return fullUser;
  }
}

/**
 * FakeProfileService - In-memory profile service for testing
 */
export class FakeProfileService {
  private profiles: Map<string, StoredUser> = new Map();

  /**
   * Get profile by user ID
   */
  async getProfileById(userId: string): Promise<{
    id: string;
    email: string;
    username: string;
    handle: string;
    fullName: string | null;
    bio: string | null;
    profilePictureUrl: string | null;
    profilePictureThumbnailUrl: string | null;
    postsCount: number;
    followersCount: number;
    followingCount: number;
    createdAt: string;
    updatedAt: string;
    emailVerified: boolean;
  } | null> {
    return this.profiles.get(userId) || null;
  }

  /**
   * Seed a profile (usually called after auth service creates user)
   */
  seedProfile(profile: StoredUser): void {
    this.profiles.set(profile.id, profile);
  }

  /**
   * Clear all data (for test cleanup)
   */
  clear(): void {
    this.profiles.clear();
  }
}

/**
 * FakeDynamoClient - In-memory DynamoDB client for RefreshToken tests
 */
export class FakeDynamoClient {
  private items: Map<string, any> = new Map();

  /**
   * Mock send method for DynamoDB operations
   */
  async send(command: any): Promise<any> {
    // Handle QueryCommand for refresh token lookup
    if (command.input?.IndexName === 'GSI1') {
      const tokenPK = command.input.ExpressionAttributeValues[':tokenPK'];
      const refreshToken = tokenPK.replace('REFRESH_TOKEN#', '');

      // Return mock token item
      const item = this.items.get(refreshToken);
      return {
        Items: item ? [item] : [],
      };
    }

    return { Items: [] };
  }

  /**
   * Seed a token item (for testing)
   */
  seedToken(refreshToken: string, userId: string): void {
    this.items.set(refreshToken, {
      GSI1PK: `REFRESH_TOKEN#${refreshToken}`,
      userId,
    });
  }

  /**
   * Clear all data (for test cleanup)
   */
  clear(): void {
    this.items.clear();
  }
}

/**
 * Create linked fake services
 *
 * Creates auth and profile services that share user data.
 * When auth service creates a user, profile service can find it.
 */
export function createFakeServices() {
  const authService = new FakeAuthService();
  const profileService = new FakeProfileService();
  const dynamoClient = new FakeDynamoClient();

  // Link services: when auth creates user, add to profile service
  const originalRegister = authService.register.bind(authService);
  authService.register = async (input) => {
    const result = await originalRegister(input);
    // Seed profile with the new user
    const user = (authService as any).users.get(result.user.id);
    if (user) {
      profileService.seedProfile(user);
    }
    return result;
  };

  return {
    authService,
    profileService,
    dynamoClient: dynamoClient as any as DynamoDBDocumentClient,
    tableName: 'test-table',
    clear: () => {
      authService.clear();
      profileService.clear();
      dynamoClient.clear();
    },
  };
}
