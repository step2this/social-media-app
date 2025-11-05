/**
 * ProfileServiceAdapter
 *
 * Adapter that bridges ProfileService to IProfileRepository interface.
 * Transforms DAL Profile (fullName?: string | undefined) to Domain Profile (fullName: string).
 *
 * Advanced TypeScript Pattern: Required Field Transformation
 * Ensures optional fields from DAL are converted to required fields with defaults
 *
 * Benefits:
 * - Decouples use cases from concrete ProfileService implementation
 * - Enables dependency inversion (depend on IProfileRepository interface)
 * - Makes testing easier (mock the interface, not the concrete service)
 * - Provides type-safe error handling (Result type)
 * - Maintains backward compatibility (existing ProfileService unchanged)
 *
 * @example
 * ```typescript
 * // Create adapter
 * const profileService = new ProfileService(dynamoClient, ...);
 * const profileRepository = new ProfileServiceAdapter(profileService);
 *
 * // Use in use case
 * const useCase = new GetCurrentUserProfile(profileRepository);
 * const result = await useCase.execute({ userId });
 *
 * if (result.success) {
 *   console.log('Profile:', result.data);
 * }
 * ```
 */

import type { ProfileService } from '@social-media-app/dal';
import type { IProfileRepository, Profile } from '../../domain/repositories/IProfileRepository.js';
import { AsyncResult, UserId } from '../../shared/types/index.js';

/**
 * ProfileServiceAdapter - Adapts ProfileService to IProfileRepository
 *
 * This adapter wraps the existing ProfileService and implements the
 * IProfileRepository interface. It handles:
 * - Method name translation (getProfileById → findById)
 * - Result type wrapping (Promise<Profile> → AsyncResult<Profile | null>)
 * - Error handling (try/catch → Result type)
 * - Type conversions (branded UserId → string)
 *
 * The adapter is stateless and thread-safe.
 *
 * Features:
 * - Zero business logic (pure adaptation)
 * - Type-safe error handling
 * - Preserves error details
 * - No side effects
 * - 100% unit testable
 */
export class ProfileServiceAdapter implements IProfileRepository {
  /**
   * Creates a ProfileServiceAdapter.
   *
   * @param profileService - The ProfileService instance to adapt
   */
  constructor(private readonly profileService: ProfileService) {}


  /**
   * Find profile by user ID.
   *
   * Adapts ProfileService.getProfileById to IProfileRepository.findById.
   *
   * @param id - The user ID (branded type)
   * @returns AsyncResult with Profile if found, null if not found, or error on failure
   *
   * @example
   * ```typescript
   * const result = await adapter.findById(UserId('user-123'));
   *
   * if (!result.success) {
   *   console.error('Error:', result.error.message);
   *   return;
   * }
   *
   * if (!result.data) {
   *   console.log('Profile not found');
   *   return;
   * }
   *
   * console.log('Found:', result.data.handle);
   * ```
   */
  async findById(id: UserId): AsyncResult<Profile | null> {
    try {
      // Call ProfileService.getProfileById
      // Note: UserId is a branded type but is compatible with string at runtime
      const dalProfile = await this.profileService.getProfileById(id);

      // Transform optional fields from undefined to empty strings for domain
      const profile = dalProfile ? {
        ...dalProfile,
        fullName: dalProfile.fullName || '',
        bio: dalProfile.bio || '',
      } as Profile : null;

      // Return success with profile data (may be null if not found)
      return {
        success: true,
        data: profile,
      };
    } catch (error) {
      // Wrap error in Result type
      // Convert non-Error values to Error instances
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        error: err,
      };
    }
  }

  /**
   * Find profile by user handle.
   *
   * Adapts ProfileService.getProfileByHandle to IProfileRepository.findByHandle.
   *
   * @param handle - The user handle (e.g., "@johndoe" or "johndoe")
   * @returns AsyncResult with Profile if found, null if not found, or error on failure
   *
   * @example
   * ```typescript
   * const result = await adapter.findByHandle('@johndoe');
   *
   * if (result.success && result.data) {
   *   console.log('User ID:', result.data.id);
   * }
   * ```
   */
  async findByHandle(handle: string): AsyncResult<Profile | null> {
    try {
      // Call ProfileService.getProfileByHandle
      const dalProfile = await this.profileService.getProfileByHandle(handle);

      // Transform optional fields from undefined to empty strings for domain
      const profile = dalProfile ? {
        ...dalProfile,
        fullName: dalProfile.fullName || '',
        bio: dalProfile.bio || '',
      } as Profile : null;

      // Return success with profile data (may be null if not found)
      return {
        success: true,
        data: profile,
      };
    } catch (error) {
      // Wrap error in Result type
      // Convert non-Error values to Error instances
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        error: err,
      };
    }
  }
}
