/**
 * GraphQL Operations for Comments
 *
 * Type-safe GraphQL queries and mutations for comment operations.
 * Uses const assertions for compile-time query validation.
 */

/**
 * Comment fragment - reusable fields
 */
export const COMMENT_FRAGMENT = `
  fragment CommentFields on Comment {
    id
    postId
    userId
    userHandle
    content
    createdAt
    updatedAt
  }
` as const;

/**
 * Create a comment on a post
 */
export const CREATE_COMMENT_MUTATION = `
  ${COMMENT_FRAGMENT}
  mutation CreateComment($input: CreateCommentInput!) {
    createComment(input: $input) {
      comment {
        ...CommentFields
      }
      commentsCount
    }
  }
` as const;

/**
 * Get comments for a post with pagination
 */
export const GET_COMMENTS_QUERY = `
  ${COMMENT_FRAGMENT}
  query GetComments($postId: ID!, $limit: Int, $cursor: String) {
    comments(postId: $postId, limit: $limit, cursor: $cursor) {
      comments {
        ...CommentFields
      }
      hasMore
      nextCursor
      totalCount
    }
  }
` as const;

/**
 * Delete a comment
 */
export const DELETE_COMMENT_MUTATION = `
  mutation DeleteComment($commentId: ID!) {
    deleteComment(commentId: $commentId) {
      success
    }
  }
` as const;
