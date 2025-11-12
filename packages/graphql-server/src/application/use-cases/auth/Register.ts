/**
 * Register Use Case
 *
 * Handles user registration with email, password, and username.
 * Creates a new user account and returns the user profile with auth tokens.
 *
 * Business Rules:
 * - Email must be unique (not already registered)
 * - Username must be unique (not already taken)
 * - Password must meet security requirements (validated by auth service)
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
 * Input for Register use case
 */
export interface RegisterInput {
  /**
   * User's email address (must be unique)
   */
  email: string;

  /**
   * User's password (will be hashed before storage)
   */
  password: string;

  /**
   * User's username (must be unique)
   */
  username: string;
}

/**
 * Output for Register use case
 */
export interface RegisterOutput {
  /**
   * The newly registered user's profile
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
   * Authentication tokens for the new user
   */
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * Service interfaces needed by this use case
 */
export interface RegisterServices {
  authService: {
    register(input: {
      email: string;
      password: string;
      username: string;
    }): Promise<{
      user: { id: string };
      tokens?: { accessToken: string; refreshToken: string };
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
 * Register Use Case
 *
 * Orchestrates user registration across auth and profile services
 */
export class Register {
  constructor(private readonly services: RegisterServices) {}

  /**
   * Execute the Register use case
   *
   * @param input - Registration input (email, password, username)
   * @returns Result with user profile and tokens, or error
   */
  async execute(input: RegisterInput): AsyncResult<RegisterOutput> {
    try {
      // Call auth service to register user
      const authResult = await this.services.authService.register({
        email: input.email,
        password: input.password,
        username: input.username,
      });

      // Ensure tokens are available (check this first before profile lookup)
      if (!authResult.tokens) {
        return {
          success: false,
          error: new Error('Failed to generate authentication tokens'),
        };
      }

      // Get full profile for the new user
      const profile = await this.services.profileService.getProfileById(
        authResult.user.id
      );

      if (!profile) {
        return {
          success: false,
          error: new Error('Failed to create user profile'),
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
      // Handle specific error cases
      if (error instanceof Error) {
        // Email already registered
        if (error.message.includes('Email already registered')) {
          return {
            success: false,
            error: new Error(error.message),
          };
        }

        // Username already taken
        if (error.message.includes('Username already taken')) {
          return {
            success: false,
            error: new Error(error.message),
          };
        }
      }

      // Return generic error for unexpected cases
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to register user'),
      };
    }
  }
}
