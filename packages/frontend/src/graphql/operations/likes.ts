/**
 * GraphQL Operations for Like Service
 *
 * Defines all GraphQL mutations and queries for like operations.
 * Uses const assertions for type safety and consistency.
 */

/**
 * GraphQL Like Response Type
 */
export interface LikeResponse {
  success: boolean;
  likesCount: number;
  isLiked: boolean;
}

/**
 * GraphQL Like Status Type
 */
export interface LikeStatus {
  isLiked: boolean;
  likesCount: number;
}

/**
 * Mutation: Like a post
 */
export const LIKE_POST_MUTATION = `
  mutation LikePost($postId: ID!) {
    likePost(postId: $postId) {
      success
      likesCount
      isLiked
    }
  }
` as const;

/**
 * Mutation: Unlike a post
 */
export const UNLIKE_POST_MUTATION = `
  mutation UnlikePost($postId: ID!) {
    unlikePost(postId: $postId) {
      success
      likesCount
      isLiked
    }
  }
` as const;

/**
 * Query: Get like status for a post
 */
export const GET_LIKE_STATUS_QUERY = `
  query GetLikeStatus($postId: ID!) {
    postLikeStatus(postId: $postId) {
      isLiked
      likesCount
    }
  }
` as const;
