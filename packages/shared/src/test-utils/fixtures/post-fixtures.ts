/**
 * Post Test Fixtures
 *
 * Shared post factory functions for creating test data across all packages.
 * Supports Post, PostGridItem, and PostWithAuthor types.
 *
 * @example
 * ```typescript
 * import { createMockPost, createMockPostConnection } from '@social-media-app/shared/test-utils';
 *
 * // Create a basic post
 * const post = createMockPost({ caption: 'Hello world!' });
 *
 * // Create posts with pagination
 * const connection = createMockPostConnection(createMockPosts(3), true);
 * ```
 */

import type { Post, PostGridItem, PostWithAuthor } from '../../schemas/index.js';
import { createMockPublicProfile } from './profile-fixtures.js';

/**
 * Create a mock Post with sensible defaults
 *
 * @param overrides - Partial Post properties to override defaults
 * @returns Complete Post object
 */
export function createMockPost(overrides: Partial<Post> = {}): Post {
  const now = new Date().toISOString();
  return {
    id: 'post-1',
    userId: 'user-1',
    userHandle: 'testuser',
    imageUrl: 'https://example.com/images/post-1.jpg',
    thumbnailUrl: 'https://example.com/thumbnails/post-1.jpg',
    caption: 'Test post caption',
    tags: [],
    likesCount: 0,
    commentsCount: 0,
    isPublic: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create multiple mock posts
 *
 * @param count - Number of posts to create
 * @param overrides - Common overrides for all posts
 * @returns Array of Post objects
 */
export function createMockPosts(
  count: number,
  overrides: Partial<Post> = {}
): Post[] {
  return Array.from({ length: count }, (_, index) => createMockPost({
    id: `post-${index + 1}`,
    userId: `user-${index + 1}`,
    userHandle: `user${index + 1}`,
    imageUrl: `https://example.com/images/post-${index + 1}.jpg`,
    thumbnailUrl: `https://example.com/thumbnails/post-${index + 1}.jpg`,
    caption: `Test post ${index + 1}`,
    ...overrides,
  }));
}

/**
 * Create a mock PostGridItem (minimal data for grid display)
 *
 * @param overrides - Partial PostGridItem properties to override defaults
 * @returns Complete PostGridItem object
 */
export function createMockPostGridItem(
  overrides: Partial<PostGridItem> = {}
): PostGridItem {
  const now = new Date().toISOString();
  return {
    id: 'post-1',
    userId: 'user-1',
    userHandle: 'testuser',
    thumbnailUrl: 'https://example.com/thumbnails/post-1.jpg',
    caption: 'Test post caption',
    likesCount: 0,
    commentsCount: 0,
    createdAt: now,
    ...overrides,
  };
}

/**
 * Create multiple mock PostGridItems
 *
 * @param count - Number of grid items to create
 * @param overrides - Common overrides for all items
 * @returns Array of PostGridItem objects
 */
export function createMockPostGridItems(
  count: number,
  overrides: Partial<PostGridItem> = {}
): PostGridItem[] {
  return Array.from({ length: count }, (_, index) => createMockPostGridItem({
    id: `post-${index + 1}`,
    userId: `user-${index + 1}`,
    userHandle: `user${index + 1}`,
    thumbnailUrl: `https://example.com/thumbnails/post-${index + 1}.jpg`,
    caption: `Test post ${index + 1}`,
    ...overrides,
  }));
}

/**
 * Create a mock PostWithAuthor (optimized for feed display with author info)
 *
 * @param overrides - Partial PostWithAuthor properties to override defaults
 * @returns Complete PostWithAuthor object
 */
export function createMockPostWithAuthor(
  overrides: Partial<PostWithAuthor> = {}
): PostWithAuthor {
  const now = new Date().toISOString();
  const profile = createMockPublicProfile({ id: 'user-1', handle: 'testuser' });
  
  return {
    id: 'post-1',
    userId: 'user-1',
    userHandle: 'testuser',
    imageUrl: 'https://example.com/images/post-1.jpg',
    caption: 'Test post caption',
    likesCount: 0,
    commentsCount: 0,
    createdAt: now,
    authorId: profile.id,
    authorHandle: profile.handle,
    authorFullName: profile.fullName ?? undefined,
    authorProfilePictureUrl: profile.profilePictureUrl ?? undefined,
    isLiked: false,
    ...overrides,
  };
}

/**
 * Create multiple mock PostWithAuthor objects
 *
 * @param count - Number of posts to create
 * @param overrides - Common overrides for all posts
 * @returns Array of PostWithAuthor objects
 */
export function createMockPostsWithAuthor(
  count: number,
  overrides: Partial<PostWithAuthor> = {}
): PostWithAuthor[] {
  return Array.from({ length: count }, (_, index) => {
    const userId = `user-${index + 1}`;
    const userHandle = `user${index + 1}`;
    const profile = createMockPublicProfile({ id: userId, handle: userHandle });
    
    return createMockPostWithAuthor({
      id: `post-${index + 1}`,
      userId,
      userHandle,
      imageUrl: `https://example.com/images/post-${index + 1}.jpg`,
      caption: `Test post ${index + 1}`,
      authorId: profile.id,
      authorHandle: profile.handle,
      authorFullName: profile.fullName ?? undefined,
      authorProfilePictureUrl: profile.profilePictureUrl ?? undefined,
      ...overrides,
    });
  });
}

/**
 * Create a mock post with likes
 *
 * @param likesCount - Number of likes
 * @param isLiked - Whether current user has liked (only for PostWithAuthor)
 * @returns Post object with likes
 */
export function createMockPostWithLikes(
  likesCount: number = 10,
  isLiked: boolean = false
): PostWithAuthor {
  return createMockPostWithAuthor({ likesCount, isLiked });
}

/**
 * Create a mock post with comments
 *
 * @param commentsCount - Number of comments
 * @returns Post object with comments
 */
export function createMockPostWithComments(commentsCount: number = 5): Post {
  return createMockPost({ commentsCount });
}

/**
 * Create a mock post by a specific user
 *
 * @param userId - User ID
 * @param handle - User handle
 * @returns Post object by the specified user
 */
export function createMockPostByUser(userId: string, handle: string): Post {
  return createMockPost({
    userId,
    userHandle: handle,
  });
}

/**
 * Create a mock post with author by a specific user
 *
 * @param userId - User ID
 * @param handle - User handle
 * @returns PostWithAuthor object by the specified user
 */
export function createMockPostWithAuthorByUser(
  userId: string,
  handle: string
): PostWithAuthor {
  const profile = createMockPublicProfile({ id: userId, handle });
  return createMockPostWithAuthor({
    userId,
    userHandle: handle,
    authorId: profile.id,
    authorHandle: profile.handle,
    authorFullName: profile.fullName ?? undefined,
    authorProfilePictureUrl: profile.profilePictureUrl ?? undefined,
  });
}

/**
 * Create a mock PostConnection for pagination (Relay-style)
 *
 * @param posts - Array of posts to include
 * @param hasNextPage - Whether there are more posts
 * @returns PostConnection object
 */
export function createMockPostConnection<T extends Post | PostWithAuthor>(
  posts: T[] = [],
  hasNextPage: boolean = false
) {
  return {
    edges: posts.map((post, index) => ({
      cursor: Buffer.from(`cursor-${index}`).toString('base64'),
      node: post,
    })),
    pageInfo: {
      hasNextPage,
      hasPreviousPage: false,
      startCursor: posts.length > 0 ? Buffer.from('cursor-0').toString('base64') : null,
      endCursor:
        posts.length > 0
          ? Buffer.from(`cursor-${posts.length - 1}`).toString('base64')
          : null,
    },
  };
}
