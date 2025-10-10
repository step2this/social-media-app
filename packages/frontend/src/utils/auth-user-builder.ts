/**
 * Authentication User Builder Utilities
 *
 * Pure functions for building and normalizing user objects from various API responses.
 * Handles missing fields, timestamp fallbacks, and user data extraction from profiles.
 */

import type { User } from '@social-media-app/shared';

/**
 * Ensures a user object has both createdAt and updatedAt timestamps
 * Uses createdAt as fallback for updatedAt if missing
 *
 * @param user - The user object to normalize
 * @returns User object with guaranteed timestamps
 */
export const ensureUserTimestamps = (user: Partial<User> & Pick<User, 'createdAt'>): User => {
  return {
    ...user,
    updatedAt: user.updatedAt || user.createdAt,
  } as User;
};

/**
 * Builds a complete user object with fallback values for missing fields
 * Primarily used for registration and login responses that may have incomplete data
 *
 * @param userData - Raw user data from API response
 * @returns Complete User object with fallbacks applied
 */
export const buildUserWithFallbacks = (userData: any): User => {
  return {
    ...userData,
    updatedAt: userData.updatedAt || userData.createdAt,
  };
};

/**
 * Extracts User fields from a Profile response object
 * Profile responses include additional fields (displayName, bio, counts) that aren't part of User type
 *
 * @param profile - Profile object from API response
 * @returns User object with only User-specific fields
 */
export const extractUserFromProfile = (profile: any): User => {
  return {
    id: profile.id,
    email: profile.email,
    username: profile.username,
    emailVerified: profile.emailVerified,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
};
