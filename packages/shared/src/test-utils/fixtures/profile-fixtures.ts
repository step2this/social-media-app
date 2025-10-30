/**
 * Profile Test Fixtures
 *
 * Shared profile factory functions for creating test data across all packages.
 * Handles both Profile (full with email) and PublicProfile (without email, with isFollowing).
 *
 * @example
 * ```typescript
 * import { createMockProfile, createMockPublicProfile } from '@social-media-app/shared/test-utils';
 *
 * // Full profile (authenticated user viewing their own)
 * const myProfile = createMockProfile({ handle: 'johndoe' });
 *
 * // Public profile (viewing another user)
 * const otherProfile = createMockPublicProfile({ handle: 'janedoe', isFollowing: true });
 * ```
 */

import type { Profile, PublicProfile } from '../../schemas/index.js';

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
    id: 'user-123',
    email: 'testuser@example.com',
    username: 'testuser',
    emailVerified: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
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
    id: 'user-123',
    username: 'testuser',
    createdAt: '2024-01-15T10:00:00Z',
    handle: 'testuser',
    fullName: 'John Doe',
    bio: 'Software developer and coffee enthusiast',
    profilePictureUrl: 'https://example.com/avatars/testuser.jpg',
    profilePictureThumbnailUrl: undefined,
    postsCount: 42,
    followersCount: 150,
    followingCount: 200,
    isFollowing: undefined,
    ...overrides,
  };
}

/**
 * Create multiple mock profiles for testing
 */
export function createMockProfiles(count: number): Profile[] {
  return Array.from({ length: count }, (_, i) => createMockProfile({
    id: `user-${i + 1}`,
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
  id: 'user-me',
  handle: 'myhandle',
  fullName: 'My Name',
  bio: 'This is my bio',
});

/**
 * Mock public profile for testing - another user's profile (you are following)
 */
export const mockFollowedProfile = createMockPublicProfile({
  id: 'user-followed',
  handle: 'followeduser',
  fullName: 'Followed User',
  isFollowing: true,
});

/**
 * Mock public profile for testing - another user's profile (you are not following)
 */
export const mockUnfollowedProfile = createMockPublicProfile({
  id: 'user-unfollowed',
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
