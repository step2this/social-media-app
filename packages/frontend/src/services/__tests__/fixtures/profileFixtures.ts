import type { Profile, PublicProfile } from '@social-media-app/shared';
import type {
  GetProfileByHandleResponse,
  UpdateProfileResponse,
} from '../../../graphql/operations/profiles';

/**
 * Create a mock profile for testing (full profile with email - for authenticated user)
 *
 * Profile = User & ProfileData (intersection type)
 * User provides: id, email, username, emailVerified, createdAt, updatedAt
 * ProfileData provides: handle, fullName, bio, profilePictureUrl, counts
 *
 * Note: Profile does NOT have a separate userId field - the 'id' field IS the user ID
 * Note: Profile does NOT have isFollowing field - use createMockPublicProfile for that
 */
export function createMockProfile(
  overrides: Partial<Profile> = {}
): Profile {
  return {
    // User fields (identity)
    id: 'user-123',  // This IS the user ID
    email: 'testuser@example.com',
    username: 'testuser',
    emailVerified: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',

    // ProfileData fields (presentation)
    handle: 'testuser',
    fullName: 'John Doe',
    bio: 'Software developer and coffee enthusiast',
    profilePictureUrl: 'https://example.com/avatars/testuser.jpg',
    profilePictureThumbnailUrl: undefined,
    postsCount: 42,
    followersCount: 150,
    followingCount: 200,

    ...overrides,
  };
}

/**
 * Create a mock public profile for testing (without email - for viewing other users)
 *
 * PublicProfile = Profile without sensitive fields + isFollowing contextual field
 * Used when viewing other users' profiles
 */
export function createMockPublicProfile(
  overrides: Partial<PublicProfile> = {}
): PublicProfile {
  return {
    // User fields (identity - no email)
    id: 'user-123',
    username: 'testuser',
    createdAt: '2024-01-15T10:00:00Z',

    // ProfileData fields (presentation)
    handle: 'testuser',
    fullName: 'John Doe',
    bio: 'Software developer and coffee enthusiast',
    profilePictureUrl: 'https://example.com/avatars/testuser.jpg',
    profilePictureThumbnailUrl: undefined,
    postsCount: 42,
    followersCount: 150,
    followingCount: 200,

    // Contextual field (only for other users' profiles)
    isFollowing: undefined,

    ...overrides,
  };
}

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

/**
 * Create multiple mock profiles for testing
 */
export function createMockProfiles(count: number): Profile[] {
  return Array.from({ length: count }, (_, i) => createMockProfile({
    id: `user-${i + 1}`,  // User ID
    handle: `user${i + 1}`,
    fullName: `User ${i + 1}`,
    bio: `Bio for user ${i + 1}`,
    profilePictureUrl: `https://example.com/avatars/user${i + 1}.jpg`,
    followersCount: Math.floor(Math.random() * 1000),
    followingCount: Math.floor(Math.random() * 500),
    postsCount: Math.floor(Math.random() * 100),
  }));
}

/**
 * Mock profile for testing - your own profile
 */
export const mockOwnProfile = createMockProfile({
  id: 'user-me',  // User ID
  handle: 'myhandle',
  fullName: 'My Name',
  bio: 'This is my bio',
});

/**
 * Mock public profile for testing - another user's profile (you are following)
 */
export const mockFollowedProfile = createMockPublicProfile({
  id: 'user-followed',  // User ID
  handle: 'followeduser',
  fullName: 'Followed User',
  isFollowing: true,
});

/**
 * Mock public profile for testing - another user's profile (you are not following)
 */
export const mockUnfollowedProfile = createMockPublicProfile({
  id: 'user-unfollowed',  // User ID
  handle: 'unfolloweduser',
  fullName: 'Unfollowed User',
  isFollowing: false,
});

/**
 * Aliases for auction/bid context
 * These are the same as createMockProfile but with semantic names
 */

/**
 * Create a mock seller profile (auction context)
 * Alias for createMockProfile
 *
 * @example
 * ```typescript
 * const seller = createMockSeller({ handle: 'auctionseller' });
 * const auction = createMockAuction({ seller });
 * ```
 */
export const createMockSeller = createMockProfile;

/**
 * Create a mock bidder profile (auction context)
 * Alias for createMockProfile
 *
 * @example
 * ```typescript
 * const bidder = createMockBidder({ handle: 'topbidder' });
 * const bid = createMockBid({ bidder });
 * ```
 */
export const createMockBidder = createMockProfile;

/**
 * Create a mock winner profile (auction context)
 * Alias for createMockProfile
 *
 * @example
 * ```typescript
 * const winner = createMockWinner({ handle: 'luckybuyer' });
 * const auction = createCompletedAuction({ winner });
 * ```
 */
export const createMockWinner = createMockProfile;
