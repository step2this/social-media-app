/**
 * Re-export profile builders from shared package
 */
export {
  createMockProfile,
  createMockPublicProfile,
  createMockProfiles,
  mockOwnProfile,
  mockFollowedProfile,
  mockUnfollowedProfile,
  createMockSeller,
  createMockBidder,
  createMockWinner
} from '@social-media-app/shared/test-utils';

import { createMockProfile, createMockPublicProfile } from '@social-media-app/shared/test-utils';
import type { Profile, PublicProfile } from '@social-media-app/shared';
import type {
  GetProfileByHandleResponse,
  UpdateProfileResponse,
} from '../../../graphql/operations/profiles.js';

/**
 * Convert undefined to null for GraphQL responses
 *
 * GraphQL response types use null for optional fields, but our domain types use undefined.
 * This helper provides type-safe conversion.
 *
 * @param value - Value that may be undefined
 * @returns The value, or null if it was undefined
 */
function toGraphQLOptional<T>(value: T | undefined): T | null {
  return value ?? null;
}

/**
 * Map common profile fields from domain type (undefined) to GraphQL type (null)
 * Handles the fields that are common between Profile and PublicProfile
 */
function mapCommonProfileFields<T extends Profile | PublicProfile>(profile: T) {
  return {
    id: profile.id,
    username: profile.username,
    handle: profile.handle,
    fullName: toGraphQLOptional(profile.fullName),
    bio: toGraphQLOptional(profile.bio),
    profilePictureUrl: toGraphQLOptional(profile.profilePictureUrl),
    followersCount: profile.followersCount,
    followingCount: profile.followingCount,
    postsCount: profile.postsCount,
    createdAt: profile.createdAt,
  };
}

/**
 * Create a mock GraphQL profile response for GetProfileByHandle query
 * Uses PublicProfile because GetProfileByHandle returns public profiles with isFollowing
 *
 * Type-safe conversion from PublicProfile (uses undefined) to GraphQL response (uses null)
 */
export function createMockGetProfileResponse(
  profile: Partial<PublicProfile> = {}
): GetProfileByHandleResponse {
  const mockProfile = createMockPublicProfile(profile);
  return {
    profile: {
      ...mapCommonProfileFields(mockProfile),
      isFollowing: toGraphQLOptional(mockProfile.isFollowing),
    },
  };
}

/**
 * Create a mock GraphQL profile response for UpdateProfile mutation
 *
 * Type-safe conversion from Profile (uses undefined) to GraphQL response (uses null)
 */
export function createMockUpdateProfileResponse(
  updates: Partial<Profile> = {}
): UpdateProfileResponse {
  const mockProfile = createMockProfile(updates);
  return {
    updateProfile: {
      ...mapCommonProfileFields(mockProfile),
      email: mockProfile.email,
      emailVerified: mockProfile.emailVerified,
    },
  };
}
