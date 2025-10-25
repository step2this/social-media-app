/**
 * GraphQL operations for follow/unfollow functionality
 */

/**
 * Get follow status for a user
 */
export const GET_FOLLOW_STATUS_QUERY = `
  query GetFollowStatus($userId: ID!) {
    followStatus(userId: $userId) {
      isFollowing
      followersCount
      followingCount
    }
  }
`;

/**
 * Follow a user
 */
export const FOLLOW_USER_MUTATION = `
  mutation FollowUser($userId: ID!) {
    followUser(userId: $userId) {
      isFollowing
      followersCount
      followingCount
    }
  }
`;

/**
 * Unfollow a user
 */
export const UNFOLLOW_USER_MUTATION = `
  mutation UnfollowUser($userId: ID!) {
    unfollowUser(userId: $userId) {
      isFollowing
      followersCount
      followingCount
    }
  }
`;

/**
 * GraphQL query variable types
 */
export interface GetFollowStatusVariables extends Record<string, unknown> {
  userId: string;
}

export interface FollowUserVariables extends Record<string, unknown> {
  userId: string;
}

export interface UnfollowUserVariables extends Record<string, unknown> {
  userId: string;
}

/**
 * GraphQL response types
 */
export interface GetFollowStatusResponse {
  followStatus: {
    isFollowing: boolean;
    followersCount: number;
    followingCount: number;
  };
}

export interface FollowUserResponse {
  followUser: {
    isFollowing: boolean;
    followersCount: number;
    followingCount: number;
  };
}

export interface UnfollowUserResponse {
  unfollowUser: {
    isFollowing: boolean;
    followersCount: number;
    followingCount: number;
  };
}
