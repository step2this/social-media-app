/**
 * Post Service Interface
 *
 * Defines the contract for post management services.
 * Supports dependency injection and easy swapping of implementations.
 */

import type { AsyncState } from '../../graphql/types';

/**
 * Post entity as returned by the service
 */
export interface Post {
  id: string;
  userId: string;
  author: {
    id: string;
    handle: string;
    username: string;
    displayName: string | null;
    profilePictureUrl: string | null;
  };
  caption: string | null;
  imageUrl: string;
  thumbnailUrl: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a new post
 */
export interface CreatePostInput {
  fileType: string;
  caption?: string;
}

/**
 * Input for updating an existing post
 */
export interface UpdatePostInput {
  caption?: string;
}

/**
 * Response from creating a post (includes upload URLs)
 */
export interface CreatePostPayload {
  post: Post;
  uploadUrl: string;
  thumbnailUploadUrl: string;
}

/**
 * Paginated connection for posts
 */
export interface PostConnection {
  edges: Array<{
    cursor: string;
    node: Post;
  }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
}

/**
 * Post Service Interface
 *
 * All implementations must provide these methods.
 * Returns AsyncState for consistent state management.
 */
export interface IPostService {
  /**
   * Create a new post
   *
   * @param input - Post creation data
   * @returns AsyncState with CreatePostPayload (includes upload URLs)
   */
  createPost(input: CreatePostInput): Promise<AsyncState<CreatePostPayload>>;

  /**
   * Get a single post by ID
   *
   * @param id - Post ID
   * @returns AsyncState with Post
   */
  getPost(id: string): Promise<AsyncState<Post>>;

  /**
   * Get posts for a specific user
   *
   * @param handle - User handle
   * @param limit - Maximum number of posts to return
   * @param cursor - Pagination cursor
   * @returns AsyncState with PostConnection
   */
  getUserPosts(
    handle: string,
    limit?: number,
    cursor?: string
  ): Promise<AsyncState<PostConnection>>;

  /**
   * Update an existing post
   *
   * @param id - Post ID
   * @param input - Updated post data
   * @returns AsyncState with updated Post
   */
  updatePost(id: string, input: UpdatePostInput): Promise<AsyncState<Post>>;

  /**
   * Delete a post
   *
   * @param id - Post ID
   * @returns AsyncState with boolean success indicator
   */
  deletePost(id: string): Promise<AsyncState<boolean>>;
}
