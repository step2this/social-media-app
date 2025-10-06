/**
 * Unified User-Profile entity for DynamoDB single-table design
 *
 * This entity represents the single database record that contains both
 * User identity data and Profile presentation data. Services can map
 * different portions of this entity to their respective domain objects.
 *
 * DynamoDB Structure:
 * - PK: USER#<userId>
 * - SK: PROFILE
 * - GSI1: Email lookup (EMAIL#<email> -> USER#<userId>)
 * - GSI2: Username lookup (USERNAME#<username> -> USER#<userId>)
 * - GSI3: Handle lookup (HANDLE#<handle> -> USER#<userId>)
 */
export interface UserProfileEntity {
  // DynamoDB access patterns
  PK: string; // USER#<userId>
  SK: string; // PROFILE
  GSI1PK: string; // EMAIL#<email>
  GSI1SK: string; // USER#<userId>
  GSI2PK: string; // USERNAME#<username>
  GSI2SK: string; // USER#<userId>
  GSI3PK?: string; // HANDLE#<handle>
  GSI3SK?: string; // USER#<userId>

  // Identity fields (User domain)
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  salt: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpiry?: string;

  // Profile fields (Profile domain)
  handle?: string;
  fullName?: string;
  bio?: string;
  avatarUrl?: string; // Legacy field, use profilePictureUrl instead
  profilePictureUrl?: string;
  profilePictureThumbnailUrl?: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;

  // Common fields
  createdAt: string;
  updatedAt: string;
  entityType: 'USER_PROFILE';
}

/**
 * Helper functions to map between unified entity and domain objects
 */

/**
 * Extract User identity data from unified entity
 */
export function mapEntityToUser(entity: UserProfileEntity) {
  return {
    id: entity.id,
    email: entity.email,
    username: entity.username,
    emailVerified: entity.emailVerified,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt
  };
}

/**
 * Extract Profile presentation data from unified entity
 */
export function mapEntityToProfile(entity: UserProfileEntity) {
  return {
    id: entity.id,
    email: entity.email,
    username: entity.username,
    emailVerified: entity.emailVerified,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    handle: entity.handle,
    fullName: entity.fullName,
    bio: entity.bio,
    profilePictureUrl: entity.profilePictureUrl,
    profilePictureThumbnailUrl: entity.profilePictureThumbnailUrl,
    postsCount: entity.postsCount,
    followersCount: entity.followersCount,
    followingCount: entity.followingCount
  };
}

/**
 * Extract public profile data (no sensitive information)
 */
export function mapEntityToPublicProfile(entity: UserProfileEntity) {
  return {
    id: entity.id,
    username: entity.username,
    handle: entity.handle,
    fullName: entity.fullName,
    bio: entity.bio,
    profilePictureUrl: entity.profilePictureUrl,
    profilePictureThumbnailUrl: entity.profilePictureThumbnailUrl,
    postsCount: entity.postsCount,
    followersCount: entity.followersCount,
    followingCount: entity.followingCount,
    createdAt: entity.createdAt
  };
}

/**
 * Create DynamoDB keys for the unified entity
 */
export function createUserProfileKeys(userId: string, email?: string, username?: string, handle?: string) {
  return {
    PK: `USER#${userId}`,
    SK: 'PROFILE',
    GSI1PK: email ? `EMAIL#${email}` : undefined,
    GSI1SK: `USER#${userId}`,
    GSI2PK: username ? `USERNAME#${username}` : undefined,
    GSI2SK: `USER#${userId}`,
    GSI3PK: handle ? `HANDLE#${handle}` : undefined,
    GSI3SK: handle ? `USER#${userId}` : undefined
  };
}