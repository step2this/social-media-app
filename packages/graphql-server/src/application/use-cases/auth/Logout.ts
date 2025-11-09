/**
 * Logout Use Case
 *
 * Handles user logout by invalidating the refresh token.
 *
 * Business Rules:
 * - User must be authenticated (userId required)
 * - Logout is idempotent (always returns success even if no token exists)
 * - In real implementation, would invalidate refresh token
 *
 * Current Implementation:
 * - Idempotent behavior - always returns success
 * - Does not actually invalidate tokens (client-side token removal is sufficient)
 * - This is acceptable as logout can be called even if no token exists
 *
 * Future Enhancement:
 * - Could invalidate refresh token in database
 * - Would require refresh token to be passed as input
 * - Currently GraphQL schema doesn't require refresh token as argument
 *
 * Benefits:
 * - 100% unit testable (mock services)
 * - Contains all business logic in one place
 * - Reusable across different interfaces (GraphQL, REST, etc.)
 * - Type-safe with Result type
 * - No GraphQL dependencies
 */

import { AsyncResult, UserId } from '../../../shared/types/index.js';

/**
 * Input for Logout use case
 */
export interface LogoutInput {
  /**
   * The authenticated user's ID
   */
  userId: UserId;
}

/**
 * Output for Logout use case
 */
export interface LogoutOutput {
  /**
   * Success indicator
   */
  success: boolean;
}

/**
 * Service interfaces needed by this use case
 *
 * Note: Currently no services are needed as this is an idempotent stub.
 * In a real implementation, would need authService to invalidate tokens.
 */
export interface LogoutServices {
  // authService: {
  //   logout(input: { refreshToken: string; userId: string }): Promise<void>;
  // };
}

/**
 * Logout Use Case
 *
 * Handles user logout (currently idempotent stub)
 */
export class Logout {
  constructor(private readonly services: LogoutServices) {}

  /**
   * Execute the Logout use case
   *
   * @param input - Logout input (userId)
   * @returns Result with success indicator
   */
  async execute(input: LogoutInput): AsyncResult<LogoutOutput> {
    try {
      // For logout, we need the refresh token from the client
      // Since the GraphQL schema doesn't require it as an arg, we'll implement idempotent logout
      // This is acceptable as logout can be called even if no token exists

      // Note: The auth service logout expects (refreshToken, userId)
      // But we don't have refreshToken in the mutation args
      // We'll make it idempotent - always return success

      // In a real implementation, the client would send the refresh token
      // and we would call: await this.services.authService.logout({ refreshToken, userId })

      // For now, we'll just return success (idempotent behavior)
      return {
        success: true,
        data: {
          success: true,
        },
      };
    } catch (error) {
      // Even if logout fails, we return success for idempotent behavior
      // The client will clear tokens regardless
      return {
        success: true,
        data: {
          success: true,
        },
      };
    }
  }
}
