/**
 * GraphQL Post Operations
 *
 * GraphQL query and mutation definitions for post management.
 * Uses const assertions for type safety.
 */

/**
 * Fragment for Post fields
 */
export const POST_FRAGMENT = `
  fragment PostFields on Post {
    id
    userId
    author {
      id
      handle
      username
      displayName
      profilePictureUrl
    }
    caption
    imageUrl
    thumbnailUrl
    likesCount
    commentsCount
    isLiked
    createdAt
    updatedAt
  }
` as const;

/**
 * Create a new post
 */
export const CREATE_POST_MUTATION = `
  ${POST_FRAGMENT}

  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      post {
        ...PostFields
      }
      uploadUrl
      thumbnailUploadUrl
    }
  }
` as const;

/**
 * Get a single post by ID
 */
export const GET_POST_QUERY = `
  ${POST_FRAGMENT}

  query GetPost($id: ID!) {
    post(id: $id) {
      ...PostFields
    }
  }
` as const;

/**
 * Get posts for a specific user
 */
export const GET_USER_POSTS_QUERY = `
  ${POST_FRAGMENT}

  query GetUserPosts($handle: String!, $limit: Int, $cursor: String) {
    userPosts(handle: $handle, limit: $limit, cursor: $cursor) {
      edges {
        cursor
        node {
          ...PostFields
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
` as const;

/**
 * Update an existing post
 */
export const UPDATE_POST_MUTATION = `
  ${POST_FRAGMENT}

  mutation UpdatePost($id: ID!, $input: UpdatePostInput!) {
    updatePost(id: $id, input: $input) {
      ...PostFields
    }
  }
` as const;

/**
 * Delete a post
 */
export const DELETE_POST_MUTATION = `
  mutation DeletePost($id: ID!) {
    deletePost(id: $id) {
      success
    }
  }
` as const;
