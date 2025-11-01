/**
 * GetCurrentUserProfile Use Case
 *
 * Retrieves the authenticated user's profile.
 * This is the business logic layer between resolvers and repositories.
 *
 * Business Rules:
 * - User must be authenticated (userId required)
 * - Profile must exist in the system
 * - Returns error if not authenticated or profile not found
 *
 * Benefits:
 * - 100% unit testable (mock IProfileRepository)
 * - Contains all business logic in one place
 * - Reusable across different interfaces (GraphQL, REST, etc.)
 * - Type-safe with Result type
 * - No GraphQL dependencies
 *
 * @example
 * ```typescript
 * // In GraphQL resolver:
 * const useCase = new GetCurrentUserProfile(profileRepository);
 * const result = await useCase.execute({ userId });
 *
 * if (!result.success) {
 *   throw ErrorFactory.create(result.error.message);
 * }
 *
 * return result.data;
 * ```
 */

import type { IProfileRepository, Profile } from '../../../domain/repositories/IProfileRepository.js';
import { AsyncResult, UserId } from '../../../shared/types/index.js';

/**
 * Input for GetCurrentUserProfile use case
 */
export interface GetCurrentUserProfileInput {
  /**
   * The authenticated user's ID.
   * Undefined if the request is not authenticated.
   */
  userId?: UserId;
}

/**
 * GetCurrentUserProfile - Use case for retrieving authenticated user's profile
 *
 * This use case encapsulates the business logic for fetching the current user's profile.
 * It validates authentication, checks profile existence, and handles errors gracefully.
 *
 * The use case is the boundary between the application layer (business logic)
 * and the domain layer (repositories). It orchestrates the flow but delegates
 * data access to the repository.
 */
export class GetCurrentUserProfile {
  /**
   * Creates a GetCurrentUserProfile use case.
   *
   * @param profileRepository - The profile repository for data access
   */
  constructor(private readonly profileRepository: IProfileRepository) {}

  /**
   * Execute the use case.
   *
   * Flow:
   * 1. Validate user is authenticated (userId exists)
   * 2. Fetch profile from repository
   * 3. Validate profile exists
   * 4. Return profile or error
   *
   * @param input - The use case input
   * @returns AsyncResult with Profile on success, or Error on failure
   *
   * @example
   * ```typescript
   * const result = await useCase.execute({ userId: UserId('user-123') });
   *
   * if (!result.success) {
   *   console.error(result.error.message);
   *   return;
   * }
   *
   * console.log('Profile:', result.data.handle);
   * ```
   */
  async execute(input: GetCurrentUserProfileInput): AsyncResult<Profile> {
    // Business Rule: User must be authenticated
    if (!input.userId) {
      return {
        success: false,
        error: new Error('You must be authenticated to access your profile'),
      };
    }

    // Fetch profile from repository
    const repositoryResult = await this.profileRepository.findById(input.userId);

    // Propagate repository errors
    if (!repositoryResult.success) {
      return repositoryResult;
    }

    // Business Rule: Profile must exist
    if (!repositoryResult.data) {
      return {
        success: false,
        error: new Error('Profile not found'),
      };
    }

    // Success: Return profile
    return {
      success: true,
      data: repositoryResult.data,
    };
  }
}
