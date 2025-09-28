/**
 * Mock Authentication Service for Smoke Tests
 * Provides isolated authentication testing without external dependencies
 */

export interface TestUser {
  id: string;
  email: string;
}

export interface LoginResult {
  success: boolean;
  token?: string;
  user?: TestUser;
  error?: string;
}

export interface LogoutResult {
  success: boolean;
}

export interface TokenValidation {
  valid: boolean;
  user?: TestUser;
}

export interface CleanupResult {
  success: boolean;
}

/**
 * Mock authentication service for isolated testing
 * Simulates authentication workflows without external API calls
 */
export class MockAuthService {
  private users = new Map<string, { email: string; password: string }>();
  private tokens = new Map<string, string>(); // token -> userId

  /**
   * Create a test user for isolated testing
   */
  async createTestUser(email: string, password: string): Promise<TestUser> {
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.users.set(userId, { email, password });

    return {
      id: userId,
      email
    };
  }

  /**
   * Mock login with email/password
   */
  async login(email: string, password: string): Promise<LoginResult> {
    // Find user by email
    for (const [userId, userData] of this.users.entries()) {
      if (userData.email === email) {
        if (userData.password === password) {
          // Generate mock token
          const token = `token-${Date.now()}-${Math.random().toString(36).substr(2, 16)}`;
          this.tokens.set(token, userId);

          return {
            success: true,
            token,
            user: { id: userId, email }
          };
        } else {
          return {
            success: false,
            error: 'Invalid credentials'
          };
        }
      }
    }

    return {
      success: false,
      error: 'User not found'
    };
  }

  /**
   * Mock logout
   */
  async logout(token: string): Promise<LogoutResult> {
    this.tokens.delete(token);
    return { success: true };
  }

  /**
   * Mock token validation
   */
  async validateToken(token: string): Promise<TokenValidation> {
    const userId = this.tokens.get(token);
    if (!userId) {
      return { valid: false };
    }

    const userData = this.users.get(userId);
    if (!userData) {
      return { valid: false };
    }

    return {
      valid: true,
      user: { id: userId, email: userData.email }
    };
  }

  /**
   * Cleanup test user (simulates deletion)
   */
  async cleanupTestUser(userId: string): Promise<CleanupResult> {
    this.users.delete(userId);

    // Also cleanup any tokens for this user
    for (const [token, tokenUserId] of this.tokens.entries()) {
      if (tokenUserId === userId) {
        this.tokens.delete(token);
      }
    }

    return { success: true };
  }
}