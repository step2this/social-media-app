/**
 * GraphQL operations for profiles
 * Contains queries and mutations for user profile management
 */

/**
 * Get authenticated user's own profile
 * Returns full Profile with email
 */
export const GET_ME_QUERY = `
  query GetMe {
    me {
      id
      username
      email
      emailVerified
      handle
      fullName
      bio
      profilePictureUrl
      followersCount
      followingCount
      postsCount
      createdAt
    }
  }
`;

/**
 * Get public profile by handle
 * Returns PublicProfile without email
 */
export const GET_PROFILE_BY_HANDLE_QUERY = `
  query GetProfileByHandle($handle: String!) {
    profile(handle: $handle) {
      id
      username
      handle
      fullName
      bio
      profilePictureUrl
      followersCount
      followingCount
      postsCount
      isFollowing
      createdAt
    }
  }
`;

/**
 * Update user profile mutation
 * Returns full Profile (authenticated user's own profile)
 */
export const UPDATE_PROFILE_MUTATION = `
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      username
      email
      emailVerified
      handle
      fullName
      bio
      profilePictureUrl
      followersCount
      followingCount
      postsCount
      createdAt
    }
  }
`;

/**
 * GraphQL query variable types
 */
export interface GetProfileByHandleVariables extends Record<string, unknown> {
  handle: string;
}

export interface UpdateProfileVariables extends Record<string, unknown> {
  input: {
    handle?: string;
    fullName?: string;
    bio?: string;
  };
}

/**
 * GraphQL response types
 */
export interface GetMeResponse {
  me: {
    id: string;
    username: string;
    email: string;
    emailVerified: boolean;
    handle: string;
    fullName: string | null;
    bio: string | null;
    profilePictureUrl: string | null;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    createdAt: string;
  };
}

export interface GetProfileByHandleResponse {
  profile: {
    id: string;
    username: string;
    handle: string;
    fullName: string | null;
    bio: string | null;
    profilePictureUrl: string | null;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    isFollowing: boolean | null;
    createdAt: string;
  };
}

export interface UpdateProfileResponse {
  updateProfile: {
    id: string;
    username: string;
    email: string;
    emailVerified: boolean;
    handle: string;
    fullName: string | null;
    bio: string | null;
    profilePictureUrl: string | null;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    createdAt: string;
  };
}
