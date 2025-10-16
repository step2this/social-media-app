/**
 * Auth Mutation Resolver Tests (TDD RED Phase)
 *
 * Tests GraphQL Auth Mutation resolvers by mocking DAL AuthService.
 *
 * Test Focus (GraphQL concerns only):
 * - Authentication mutation operations (register, login, refreshToken, logout)
 * - Token generation and validation
 * - Response field mapping (DAL types → GraphQL types)
 * - Error handling (email already exists, invalid credentials, expired tokens)
 * - Profile data enrichment in auth responses
 *
 * NOT Tested Here (DAL already covers):
 * - DynamoDB operations
 * - Password hashing/verification
 * - Token storage and retrieval
 * - Business logic validation
 *
 * NOTE: These tests are expected to FAIL initially (TDD RED phase).
 * Auth resolvers will be implemented in the GREEN phase.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GraphQLError } from 'graphql';
import { Mutation } from '../../src/schema/resolvers/Mutation.js';
import { createAuthService } from '@social-media-app/dal';
import { ProfileService } from '@social-media-app/dal';
import type { GraphQLContext } from '../../src/context.js';
import type {
  RegisterResponse,
  LoginResponse,
  RefreshTokenResponse,
  LogoutResponse,
  AuthTokens,
  User,
} from '@social-media-app/shared';

describe('Auth Mutation Resolvers', () => {
  let mockContext: GraphQLContext;
  let mockAuthService: ReturnType<typeof createAuthService>;
  let mockProfileService: ProfileService;

  beforeEach(() => {
    // Create pure mock ProfileService (no real instantiation)
    mockProfileService = {
      getProfileById: vi.fn(),
    } as unknown as ProfileService;

    // Create pure mock AuthService (no real instantiation)
    mockAuthService = {
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      verifyToken: vi.fn(),
    } as unknown as ReturnType<typeof createAuthService>;

    // Create minimal mock context
    // Auth mutations do NOT require userId (they create authentication)
    mockContext = {
      userId: null, // Unauthenticated by default for auth mutations
      dynamoClient: {} as any,
      tableName: 'test-table',
      services: {
        profileService: mockProfileService,
        postService: {} as any,
        likeService: {} as any,
        commentService: {} as any,
        followService: {} as any,
        feedService: {} as any,
        notificationService: {} as any,
        authService: mockAuthService,
        auctionService: {} as any,
      },
      loaders: {} as any,
    };

    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user and return profile with tokens', async () => {
      const registerInput = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        username: 'newuser',
        handle: 'newhandle',
        fullName: 'New User',
      };

      const mockTokens: AuthTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 900,
      };

      const mockRegisterResponse: RegisterResponse = {
        user: {
          id: 'user-new-123',
          email: 'newuser@example.com',
          username: 'newuser',
          emailVerified: false,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        message: 'User registered successfully. Welcome!',
        tokens: mockTokens,
      };

      // Mock the auth service register method
      (mockAuthService.register as ReturnType<typeof vi.fn>).mockResolvedValue(mockRegisterResponse);

      // Mock profile service to enrich user data with profile fields
      (mockProfileService.getProfileById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user-new-123',
        handle: 'newhandle',
        username: 'newuser',
        email: 'newuser@example.com',
        displayName: 'New User',
        fullName: 'New User',
        bio: null,
        profilePictureUrl: null,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      const result = await Mutation.register(
        {},
        { input: registerInput },
        mockContext,
        {} as any
      );

      // Verify response structure matches GraphQL AuthPayload type
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user).toHaveProperty('id', 'user-new-123');
      expect(result.user).toHaveProperty('email', 'newuser@example.com');
      expect(result.user).toHaveProperty('handle', 'newhandle');
      expect(result.tokens).toEqual(mockTokens);
      expect(result.tokens.accessToken).toBe('mock-access-token');
      expect(result.tokens.refreshToken).toBe('mock-refresh-token');
      expect(result.tokens.expiresIn).toBe(900);
    });

    it('should throw BAD_REQUEST when email already exists', async () => {
      const registerInput = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
        username: 'existinguser',
        handle: 'existinghandle',
        fullName: 'Existing User',
      };

      // Mock auth service to throw "Email already registered" error
      (mockAuthService.register as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Email already registered')
      );

      try {
        await Mutation.register(
          {},
          { input: registerInput },
          mockContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.message).toMatch(/email already registered/i);
          expect(error.extensions.code).toBe('BAD_REQUEST');
        }
      }
    });

    it('should throw BAD_REQUEST when username already taken', async () => {
      const registerInput = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        username: 'takenusername',
        handle: 'newhandle',
        fullName: 'New User',
      };

      // Mock auth service to throw "Username already taken" error
      (mockAuthService.register as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Username already taken')
      );

      try {
        await Mutation.register(
          {},
          { input: registerInput },
          mockContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.message).toMatch(/username already taken/i);
          expect(error.extensions.code).toBe('BAD_REQUEST');
        }
      }
    });

    it('should throw INTERNAL_SERVER_ERROR for unexpected errors', async () => {
      const registerInput = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        username: 'newuser',
        handle: 'newhandle',
        fullName: 'New User',
      };

      // Mock auth service to throw unexpected error
      (mockAuthService.register as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Database connection failed')
      );

      try {
        await Mutation.register(
          {},
          { input: registerInput },
          mockContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.extensions.code).toBe('INTERNAL_SERVER_ERROR');
        }
      }
    });
  });

  describe('login', () => {
    it('should successfully login existing user and return profile with tokens', async () => {
      const loginInput = {
        email: 'user@example.com',
        password: 'SecurePass123!',
      };

      const mockTokens: AuthTokens = {
        accessToken: 'mock-access-token-login',
        refreshToken: 'mock-refresh-token-login',
        expiresIn: 900,
      };

      const mockLoginResponse: LoginResponse = {
        user: {
          id: 'user-456',
          email: 'user@example.com',
          username: 'existinguser',
          emailVerified: true,
        },
        tokens: mockTokens,
      };

      // Mock the auth service login method
      (mockAuthService.login as ReturnType<typeof vi.fn>).mockResolvedValue(mockLoginResponse);

      // Mock profile service to enrich user data with profile fields
      (mockProfileService.getProfileById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user-456',
        handle: 'existinghandle',
        username: 'existinguser',
        email: 'user@example.com',
        displayName: 'Existing User',
        fullName: 'Existing User',
        bio: 'My bio',
        profilePictureUrl: 'https://example.com/avatar.jpg',
        followersCount: 100,
        followingCount: 50,
        postsCount: 25,
        createdAt: '2023-01-01T00:00:00.000Z',
      });

      const result = await Mutation.login(
        {},
        { input: loginInput },
        mockContext,
        {} as any
      );

      // Verify response structure matches GraphQL AuthPayload type
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user).toHaveProperty('id', 'user-456');
      expect(result.user).toHaveProperty('email', 'user@example.com');
      expect(result.user).toHaveProperty('handle', 'existinghandle');
      expect(result.user).toHaveProperty('displayName', 'Existing User');
      expect(result.tokens).toEqual(mockTokens);
      expect(result.tokens.accessToken).toBe('mock-access-token-login');
    });

    it('should throw UNAUTHENTICATED when credentials are invalid', async () => {
      const loginInput = {
        email: 'user@example.com',
        password: 'WrongPassword123!',
      };

      // Mock auth service to throw "Invalid email or password" error
      (mockAuthService.login as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Invalid email or password')
      );

      try {
        await Mutation.login(
          {},
          { input: loginInput },
          mockContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.message).toMatch(/invalid email or password/i);
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });

    it('should throw UNAUTHENTICATED when user does not exist', async () => {
      const loginInput = {
        email: 'nonexistent@example.com',
        password: 'SecurePass123!',
      };

      // Mock auth service to throw "Invalid email or password" error
      (mockAuthService.login as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Invalid email or password')
      );

      try {
        await Mutation.login(
          {},
          { input: loginInput },
          mockContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.message).toMatch(/invalid email or password/i);
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh tokens and return new tokens', async () => {
      const refreshTokenInput = 'valid-refresh-token-abc123';

      const mockNewTokens: AuthTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
      };

      const mockRefreshResponse: RefreshTokenResponse = {
        tokens: mockNewTokens,
      };

      // Mock the auth service refreshToken method
      (mockAuthService.refreshToken as ReturnType<typeof vi.fn>).mockResolvedValue(mockRefreshResponse);

      // Extract userId from the refresh token to fetch profile
      // In a real scenario, the refresh token service would return userId
      const mockUserId = 'user-789';

      // Mock profile service to enrich response with user profile
      (mockProfileService.getProfileById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockUserId,
        handle: 'refreshuser',
        username: 'refreshuser',
        email: 'refresh@example.com',
        displayName: 'Refresh User',
        fullName: 'Refresh User',
        bio: null,
        profilePictureUrl: null,
        followersCount: 10,
        followingCount: 5,
        postsCount: 3,
        createdAt: '2023-06-01T00:00:00.000Z',
      });

      const result = await Mutation.refreshToken(
        {},
        { refreshToken: refreshTokenInput },
        mockContext,
        {} as any
      );

      // Verify response structure matches GraphQL AuthPayload type
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.tokens).toEqual(mockNewTokens);
      expect(result.tokens.accessToken).toBe('new-access-token');
      expect(result.tokens.refreshToken).toBe('new-refresh-token');
    });

    it('should throw UNAUTHENTICATED when refresh token is invalid', async () => {
      const invalidRefreshToken = 'invalid-token';

      // Mock auth service to throw "Invalid refresh token" error
      (mockAuthService.refreshToken as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Invalid refresh token')
      );

      try {
        await Mutation.refreshToken(
          {},
          { refreshToken: invalidRefreshToken },
          mockContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.message).toMatch(/invalid refresh token/i);
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });

    it('should throw UNAUTHENTICATED when refresh token is expired', async () => {
      const expiredRefreshToken = 'expired-token-xyz789';

      // Mock auth service to throw "Refresh token expired" error
      (mockAuthService.refreshToken as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Refresh token expired')
      );

      try {
        await Mutation.refreshToken(
          {},
          { refreshToken: expiredRefreshToken },
          mockContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.message).toMatch(/refresh token expired/i);
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });

    it('should throw NOT_FOUND when user associated with token does not exist', async () => {
      const validTokenForDeletedUser = 'valid-token-deleted-user';

      // Mock auth service to throw "User not found" error
      (mockAuthService.refreshToken as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('User not found')
      );

      try {
        await Mutation.refreshToken(
          {},
          { refreshToken: validTokenForDeletedUser },
          mockContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.message).toMatch(/user not found/i);
          expect(error.extensions.code).toBe('NOT_FOUND');
        }
      }
    });
  });

  describe('logout', () => {
    it('should successfully logout authenticated user', async () => {
      // For logout, user MUST be authenticated
      const authenticatedContext: GraphQLContext = {
        ...mockContext,
        userId: 'user-123',
      };

      // Mock auth service logout method
      (mockAuthService.logout as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await Mutation.logout(
        {},
        {},
        authenticatedContext,
        {} as any
      );

      // Verify response structure matches GraphQL LogoutResponse type
      expect(result).toEqual({ success: true });
      expect(result.success).toBe(true);
    });

    it('should throw UNAUTHENTICATED when user is not authenticated', async () => {
      // Unauthenticated context (userId is null)
      const unauthContext: GraphQLContext = {
        ...mockContext,
        userId: null,
      };

      try {
        await Mutation.logout(
          {},
          {},
          unauthContext,
          {} as any
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        if (error instanceof GraphQLError) {
          expect(error.message).toMatch(/authentication required|not authenticated/i);
          expect(error.extensions.code).toBe('UNAUTHENTICATED');
        }
      }
    });

    it('should still return success even if refresh token is not found (idempotent)', async () => {
      const authenticatedContext: GraphQLContext = {
        ...mockContext,
        userId: 'user-123',
      };

      // Mock logout to succeed even if token not found (idempotent behavior)
      (mockAuthService.logout as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await Mutation.logout(
        {},
        {},
        authenticatedContext,
        {} as any
      );

      expect(result).toEqual({ success: true });
    });
  });
});
