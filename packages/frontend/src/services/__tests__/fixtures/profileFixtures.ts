import type { Profile } from '@social-media-app/shared';
import type {
  GetProfileByHandleResponse,
  UpdateProfileResponse,
} from '../../../graphql/operations/profiles';

/**
 * Create a mock profile for testing
 */
export function createMockProfile(
  overrides: Partial<Profile> = {}
): Profile {
  return {
    id: 'profile-123',
    userId: 'user-123',
    handle: 'johndoe',
    fullName: 'John Doe',
    bio: 'Software developer and coffee enthusiast',
    profilePictureUrl: 'https://example.com/avatars/johndoe.jpg',
    followersCount: 150,
    followingCount: 200,
    postsCount: 42,
    isFollowing: false,
    createdAt: '2024-01-15T10:00:00Z',
    ...overrides,
  };
}

/**
 * Create a mock GraphQL profile response for GetProfileByHandle query
 */
export function createMockGetProfileResponse(
  profile: Partial<Profile> = {}
): GetProfileByHandleResponse {
  const mockProfile = createMockProfile(profile);
  return {
    profile: mockProfile,
  };
}

/**
 * Create a mock GraphQL profile response for UpdateProfile mutation
 */
export function createMockUpdateProfileResponse(
  updates: Partial<Profile> = {}
): UpdateProfileResponse {
  const mockProfile = createMockProfile(updates);
  return {
    updateProfile: mockProfile,
  };
}

/**
 * Create multiple mock profiles for testing
 */
export function createMockProfiles(count: number): Profile[] {
  return Array.from({ length: count }, (_, i) => createMockProfile({
    id: `profile-${i + 1}`,
    userId: `user-${i + 1}`,
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
  id: 'profile-me',
  userId: 'user-me',
  handle: 'myhandle',
  fullName: 'My Name',
  bio: 'This is my bio',
  isFollowing: null, // Own profile doesn't have isFollowing
});

/**
 * Mock profile for testing - another user's profile (you are following)
 */
export const mockFollowedProfile = createMockProfile({
  id: 'profile-followed',
  userId: 'user-followed',
  handle: 'followeduser',
  fullName: 'Followed User',
  isFollowing: true,
});

/**
 * Mock profile for testing - another user's profile (you are not following)
 */
export const mockUnfollowedProfile = createMockProfile({
  id: 'profile-unfollowed',
  userId: 'user-unfollowed',
  handle: 'unfolloweduser',
  fullName: 'Unfollowed User',
  isFollowing: false,
});
