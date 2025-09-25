import { http, HttpResponse } from 'msw';
import {
  RegisterRequestSchema,
  RegisterResponseSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  LogoutRequestSchema,
  RefreshTokenRequestSchema,
  RefreshTokenResponseSchema,
  GetProfileResponseSchema,
  UpdateUserProfileResponseSchema,
  UpdateUserProfileRequestSchema,
  type RegisterRequest,
  type RegisterResponse,
  type LoginRequest,
  type LoginResponse,
  type RefreshTokenRequest,
  type RefreshTokenResponse,
  type UserProfile,
  type GetProfileResponse,
  type UpdateUserProfileRequest,
  type UpdateUserProfileResponse,
  type AuthTokens
} from '@social-media-app/shared';

// Mock user database - In-memory storage for development
const mockUsers = new Map<string, {
  id: string;
  email: string;
  username: string;
  fullName?: string;
  passwordHash: string; // In real app, this would be properly hashed
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}>();

// Mock tokens storage
const mockTokens = new Map<string, {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}>();

// Helper function to generate a valid UUID v4 format
const generateMockUUID = (): string => {
  // Generate UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Helper function to generate mock tokens
const generateMockTokens = (userId: string): AuthTokens => {
  const accessToken = `mock_access_${userId}_${Date.now()}`;
  const refreshToken = `mock_refresh_${userId}_${Date.now()}`;
  const expiresIn = 3600; // 1 hour in seconds
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString(); // For internal tracking

  mockTokens.set(accessToken, {
    userId,
    accessToken,
    refreshToken,
    expiresAt
  });

  return {
    accessToken,
    refreshToken,
    expiresIn
  };
};

// Helper function to get user from token
const getUserFromToken = (authHeader: string | null): { id: string; email: string; username: string; fullName?: string } | null => {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const tokenData = mockTokens.get(token);

  if (!tokenData || new Date(tokenData.expiresAt) < new Date()) {
    return null;
  }

  const user = Array.from(mockUsers.values()).find(u => u.id === tokenData.userId);
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName
  };
};

// Add realistic delay helper
const addDelay = (min = 200, max = 800) =>
  new Promise(resolve => setTimeout(resolve, min + Math.random() * (max - min)));

/**
 * Authentication mock handlers for development mode
 */
export const authHandlers = [
  // Development helper endpoint to reset mock data
  http.delete('http://localhost:3001/dev/reset-mock-data', async () => {
    mockUsers.clear();
    mockTokens.clear();
    await addDelay(50, 100);

    return HttpResponse.json(
      {
        message: 'Mock data cleared successfully',
        cleared: {
          users: 0,
          tokens: 0
        }
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }),

  // Development helper endpoint to list existing mock users
  http.get('http://localhost:3001/dev/users', async () => {
    const users = Array.from(mockUsers.values()).map(user => ({
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      createdAt: user.createdAt
    }));

    await addDelay(50, 100);

    return HttpResponse.json(
      {
        users,
        count: users.length
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }),
  // Register endpoint
  http.post('http://localhost:3001/auth/register', async ({ request }) => {
    try {
      const body = await request.json() as RegisterRequest;
      const validatedRequest = RegisterRequestSchema.parse(body);

      // Check if user already exists
      const existingUserByEmail = Array.from(mockUsers.values()).find(u => u.email === validatedRequest.email);
      const existingUserByUsername = Array.from(mockUsers.values()).find(u => u.username === validatedRequest.username);

      if (existingUserByEmail) {
        await addDelay(100, 300);
        return HttpResponse.json(
          { error: 'A user with this email already exists' },
          { status: 409 }
        );
      }

      if (existingUserByUsername) {
        await addDelay(100, 300);
        return HttpResponse.json(
          { error: 'A user with this username already exists' },
          { status: 409 }
        );
      }

      // Create new user
      const userId = generateMockUUID();
      const now = new Date().toISOString();

      const newUser = {
        id: userId,
        email: validatedRequest.email,
        username: validatedRequest.username,
        fullName: validatedRequest.fullName,
        passwordHash: `hashed_${validatedRequest.password}`, // Mock password hash
        emailVerified: true, // Auto-verify for development
        createdAt: now,
        updatedAt: now
      };

      mockUsers.set(userId, newUser);

      // Generate tokens for auto-login after registration
      const tokens = generateMockTokens(userId);

      const response: RegisterResponse = {
        message: 'Registration successful. Welcome!',
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          fullName: newUser.fullName,
          emailVerified: newUser.emailVerified,
          createdAt: newUser.createdAt
        },
        tokens // Include tokens for auto-login
      };

      const validatedResponse = RegisterResponseSchema.parse(response);
      await addDelay();

      return HttpResponse.json(validatedResponse, {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      if (error?.name === 'ZodError') {
        return HttpResponse.json(
          {
            error: 'Validation failed',
            details: error.errors
          },
          { status: 400 }
        );
      }

      console.error('Mock register error:', error);
      return HttpResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }),

  // Login endpoint
  http.post('http://localhost:3001/auth/login', async ({ request }) => {
    try {
      const body = await request.json() as LoginRequest;
      const validatedRequest = LoginRequestSchema.parse(body);

      // Find user by email
      const user = Array.from(mockUsers.values()).find(u => u.email === validatedRequest.email);

      if (!user || user.passwordHash !== `hashed_${validatedRequest.password}`) {
        await addDelay(400, 600); // Longer delay for failed auth
        return HttpResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      // Generate tokens
      const tokens = generateMockTokens(user.id);

      const response: LoginResponse = {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        tokens
      };

      const validatedResponse = LoginResponseSchema.parse(response);
      await addDelay();

      return HttpResponse.json(validatedResponse, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      if (error?.name === 'ZodError') {
        return HttpResponse.json(
          {
            error: 'Validation failed',
            details: error.errors
          },
          { status: 400 }
        );
      }

      console.error('Mock login error:', error);
      return HttpResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }),

  // Logout endpoint
  http.post('http://localhost:3001/auth/logout', async ({ request }) => {
    try {
      const body = await request.json() as { refreshToken: string };
      const validatedRequest = LogoutRequestSchema.parse(body);

      // Find and remove the token
      const tokenEntry = Array.from(mockTokens.entries()).find(([_, tokenData]) =>
        tokenData.refreshToken === validatedRequest.refreshToken
      );

      if (tokenEntry) {
        mockTokens.delete(tokenEntry[0]);
      }

      await addDelay(100, 200);

      return HttpResponse.json(
        { message: 'Logout successful' },
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );

    } catch (error) {
      console.error('Mock logout error:', error);
      return HttpResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }),

  // Refresh token endpoint
  http.post('http://localhost:3001/auth/refresh', async ({ request }) => {
    try {
      const body = await request.json() as RefreshTokenRequest;
      const validatedRequest = RefreshTokenRequestSchema.parse(body);

      // Find token by refresh token
      const tokenEntry = Array.from(mockTokens.entries()).find(([_, tokenData]) =>
        tokenData.refreshToken === validatedRequest.refreshToken
      );

      if (!tokenEntry) {
        await addDelay(100, 200);
        return HttpResponse.json(
          { error: 'Invalid refresh token' },
          { status: 401 }
        );
      }

      const [oldAccessToken, tokenData] = tokenEntry;

      // Remove old token
      mockTokens.delete(oldAccessToken);

      // Generate new tokens
      const tokens = generateMockTokens(tokenData.userId);

      const response: RefreshTokenResponse = {
        tokens
      };

      const validatedResponse = RefreshTokenResponseSchema.parse(response);
      await addDelay(100, 200);

      return HttpResponse.json(validatedResponse, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      if (error?.name === 'ZodError') {
        return HttpResponse.json(
          {
            error: 'Validation failed',
            details: error.errors
          },
          { status: 400 }
        );
      }

      console.error('Mock refresh token error:', error);
      return HttpResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }),

  // Get profile endpoint
  http.get('http://localhost:3001/auth/profile', async ({ request }) => {
    try {
      const authHeader = request.headers.get('Authorization');
      const user = getUserFromToken(authHeader);

      if (!user) {
        await addDelay(100, 200);
        return HttpResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const fullUser = mockUsers.get(user.id);
      if (!fullUser) {
        return HttpResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const response: GetProfileResponse = {
        user: {
          id: fullUser.id,
          email: fullUser.email,
          username: fullUser.username,
          fullName: fullUser.fullName,
          emailVerified: fullUser.emailVerified,
          createdAt: fullUser.createdAt,
          updatedAt: fullUser.updatedAt
        }
      };

      const validatedResponse = GetProfileResponseSchema.parse(response);
      await addDelay(100, 300);

      return HttpResponse.json(validatedResponse, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      console.error('Mock get profile error:', error);
      return HttpResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }),

  // Update profile endpoint
  http.put('http://localhost:3001/auth/profile', async ({ request }) => {
    try {
      const authHeader = request.headers.get('Authorization');
      const user = getUserFromToken(authHeader);

      if (!user) {
        await addDelay(100, 200);
        return HttpResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const body = await request.json() as UpdateUserProfileRequest;
      const validatedRequest = UpdateUserProfileRequestSchema.parse(body);

      const fullUser = mockUsers.get(user.id);
      if (!fullUser) {
        return HttpResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Check for username conflicts
      if (validatedRequest.username && validatedRequest.username !== fullUser.username) {
        const existingUser = Array.from(mockUsers.values()).find(u =>
          u.username === validatedRequest.username && u.id !== user.id
        );

        if (existingUser) {
          await addDelay(100, 300);
          return HttpResponse.json(
            { error: 'Username already taken' },
            { status: 409 }
          );
        }
      }

      // Update user
      const updatedUser = {
        ...fullUser,
        username: validatedRequest.username || fullUser.username,
        fullName: validatedRequest.fullName !== undefined ? validatedRequest.fullName : fullUser.fullName,
        updatedAt: new Date().toISOString()
      };

      mockUsers.set(user.id, updatedUser);

      const response: UpdateProfileResponse = {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          fullName: updatedUser.fullName,
          emailVerified: updatedUser.emailVerified,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt
        }
      };

      const validatedResponse = UpdateProfileResponseSchema.parse(response);
      await addDelay(200, 400);

      return HttpResponse.json(validatedResponse, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      if (error?.name === 'ZodError') {
        return HttpResponse.json(
          {
            error: 'Validation failed',
            details: error.errors
          },
          { status: 400 }
        );
      }

      console.error('Mock update profile error:', error);
      return HttpResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  })
];