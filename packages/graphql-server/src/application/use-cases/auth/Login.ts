/**
 * Login Use Case
 *
 * Handles user login with email and password.
 * Authenticates the user and returns their profile with auth tokens.
 *
 * Business Rules:
 * - Email must exist in the system
 * - Password must match the stored hash
 * - Returns full user profile with auth tokens
 *
 * Benefits:
 * - 100% unit testable (mock services)
 * - Contains all business logic in one place
 * - Reusable across different interfaces (GraphQL, REST, etc.)
 * - Type-safe with Result type
 * - No GraphQL dependencies
 */

import { AsyncResult } from '../../../shared/types/index.js';

/**
 * Input for Login use case
 */
export interface LoginInput {
  /**
   * User's email address
   */
  email: string;

  /**
   * User's password
   */
  password: string;
}

/**
 * Output for Login use case
 */
export interface LoginOutput {
  /**
   * The authenticated user's profile
   */
  user: {
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
  };

  /**
   * Authentication tokens
   */
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * Service interfaces needed by this use case
 */
export interface LoginServices {
  authService: {
    login(input: {
      email: string;
      password: string;
    }): Promise<{
      user: { id: string };
      tokens: { accessToken: string; refreshToken: string };
    }>;
  };
  profileService: {
    getProfileById(userId: string): Promise<{
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
    } | null>;
  };
}

/**
 * Login Use Case
 *
 * Orchestrates user authentication across auth and profile services
 */
export class Login {
  constructor(private readonly services: LoginServices) {}

  /**
   * Execute the Login use case
   *
   * @param input - Login input (email, password)
   * @returns Result with user profile and tokens, or error
   */
  async execute(input: LoginInput): AsyncResult<LoginOutput> {
    try {
      // Call auth service to authenticate user
      const authResult = await this.services.authService.login({
        email: input.email,
        password: input.password,
      });

      // Get full profile for the authenticated user
      const profile = await this.services.profileService.getProfileById(
        authResult.user.id
      );

      if (!profile) {
        return {
          success: false,
          error: new Error('User profile not found'),
        };
      }

      // Return successful result
      return {
        success: true,
        data: {
          user: profile,
          tokens: authResult.tokens,
        },
      };
    } catch (error) {
      // Handle authentication errors
      if (error instanceof Error && error.message.includes('Invalid email or password')) {
        return {
          success: false,
          error: new Error(error.message),
        };
      }

      // Return generic error for unexpected cases
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to login'),
      };
    }
  }
}
