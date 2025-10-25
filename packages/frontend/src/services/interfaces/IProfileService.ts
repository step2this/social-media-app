import type { AsyncState } from '../../graphql/types';
import type { Profile } from '@social-media-app/shared';

/**
 * Profile update input for service layer
 * Simplified from shared schema - all fields optional for partial updates
 * Note: Validation happens at GraphQL/service boundary
 */
export interface ProfileUpdateInput {
  handle?: string;
  fullName?: string;
  bio?: string;
}

/**
 * Profile service interface
 * Handles user profile operations
 */
export interface IProfileService {
  /**
   * Get user profile by handle
   * @param handle - User handle (without @ prefix)
   * @returns AsyncState with Profile data
   */
  getProfileByHandle(handle: string): Promise<AsyncState<Profile>>;

  /**
   * Update current user's profile
   * @param updates - Profile update data (partial updates supported)
   * @returns AsyncState with updated Profile
   */
  updateProfile(updates: ProfileUpdateInput): Promise<AsyncState<Profile>>;

  /**
   * Upload profile picture
   * Note: This will be implemented when we add S3 upload support
   * @param file - Profile picture file
   * @returns AsyncState with updated Profile
   */
  // uploadProfilePicture(file: File): Promise<AsyncState<Profile>>;
}
