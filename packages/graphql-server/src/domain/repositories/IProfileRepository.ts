/**
 * IProfileRepository - Profile data access interface
 *
 * Defines the contract for profile data access.
 * This interface follows the Repository Pattern and Dependency Inversion Principle.
 *
 * Benefits:
 * - Decouples business logic from data source
 * - Enables easy testing (mock this interface)
 * - Allows swapping implementations (DB, API, cache, etc.)
 * - Type-safe with branded types
 * - Result type for explicit error handling
 *
 * Implementation:
 * - ProfileServiceAdapter: Bridges existing ProfileService to this interface
 * - Future: Could add CachedProfileRepository, DatabaseProfileRepository, etc.
 *
 * @example
 * ```typescript
 * // In use case:
 * class GetCurrentUserProfile {
 *   constructor(private readonly profileRepository: IProfileRepository) {}
 *
 *   async execute(input: { userId: UserId }): AsyncResult<Profile> {
 *     return this.profileRepository.findById(input.userId);
 *   }
 * }
 *
 * // In tests:
 * const mockRepository: IProfileRepository = {
 *   findById: vi.fn().mockResolvedValue({
 *     success: true,
 *     data: { id: 'user-1', handle: '@john' }
 *   })
 * };
 * ```
 */

import { AsyncResult, UserId } from '../../shared/types/index.js';

/**
 * Profile entity
 *
 * Represents a user's public profile information.
 * This is the domain model, separate from database models or GraphQL types.
 */
export interface Profile {
  /**
   * Unique user identifier
   */
  id: string;

  /**
   * User's unique handle (e.g., @johndoe)
   */
  handle: string;

  /**
   * User's full name
   */
  fullName: string;

  /**
   * User's biography/description
   */
  bio: string | null;

  /**
   * URL to user's profile picture
   */
  profilePictureUrl: string | null;

  /**
   * Account creation timestamp
   */
  createdAt: string;
}

/**
 * IProfileRepository - Repository interface for profile data access
 *
 * Defines methods for accessing profile data.
 * All methods return AsyncResult for type-safe error handling.
 *
 * This interface is intentionally minimal - it only defines operations
 * actually needed by the application. Don't add methods speculatively.
 */
export interface IProfileRepository {
  /**
   * Find profile by user ID.
   *
   * @param id - The user ID to look up
   * @returns AsyncResult with Profile if found, null if not found, or error on failure
   *
   * @example
   * ```typescript
   * const result = await profileRepository.findById(UserId('user-123'));
   *
   * if (!result.success) {
   *   console.error('Failed to fetch profile:', result.error);
   *   return;
   * }
   *
   * if (!result.data) {
   *   console.log('Profile not found');
   *   return;
   * }
   *
   * console.log('Found profile:', result.data.handle);
   * ```
   */
  findById(id: UserId): AsyncResult<Profile | null>;

  /**
   * Find profile by user handle.
   *
   * @param handle - The user handle to look up (e.g., "@johndoe" or "johndoe")
   * @returns AsyncResult with Profile if found, null if not found, or error on failure
   *
   * @example
   * ```typescript
   * const result = await profileRepository.findByHandle('@johndoe');
   *
   * if (result.success && result.data) {
   *   console.log('Found user:', result.data.fullName);
   * }
   * ```
   */
  findByHandle(handle: string): AsyncResult<Profile | null>;
}
