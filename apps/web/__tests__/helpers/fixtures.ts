/**
 * Test Fixtures for Next.js GraphQL Types
 *
 * These fixtures create data matching the Next.js GraphQL response structure,
 * which differs slightly from the backend DAL types.
 */

import type { Post, Author, FeedQueryResponse } from '@/lib/graphql/types';

/**
 * Create a mock Author (GraphQL response format)
 */
export function createMockAuthor(overrides: Partial<Author> = {}): Author {
  return {
    id: 'user-1',
    username: 'testuser',
    handle: 'testuser',
    fullName: 'Test User',
    bio: 'Test bio',
    profilePictureUrl: 'https://example.com/avatar.jpg',
    ...overrides,
  };
}

/**
 * Create a mock Post (GraphQL response format with author)
 */
export function createMockPost(overrides: Partial<Post> = {}): Post {
  const now = new Date().toISOString();
  return {
    id: 'post-1',
    userId: 'user-1',
    caption: 'Test post caption',
    imageUrl: 'https://example.com/images/post-1.jpg',
    thumbnailUrl: 'https://example.com/thumbnails/post-1.jpg',
    likesCount: 0,
    commentsCount: 0,
    createdAt: now,
    updatedAt: now,
    author: createMockAuthor(),
    isLiked: false,
    ...overrides,
  };
}

/**
 * Create multiple mock posts
 */
export function createMockPosts(count: number, overrides: Partial<Post> = {}): Post[] {
  return Array.from({ length: count }, (_, index) =>
    createMockPost({
      id: `post-${index + 1}`,
      userId: `user-${index + 1}`,
      caption: `Test post ${index + 1}`,
      imageUrl: `https://example.com/images/post-${index + 1}.jpg`,
      thumbnailUrl: `https://example.com/thumbnails/post-${index + 1}.jpg`,
      author: createMockAuthor({
        id: `user-${index + 1}`,
        username: `user${index + 1}`,
        handle: `user${index + 1}`,
      }),
      ...overrides,
    })
  );
}

/**
 * Create a mock post with likes
 */
export function createMockPostWithLikes(
  likesCount: number = 10,
  isLiked: boolean = false
): Post {
  return createMockPost({ likesCount, isLiked });
}

/**
 * Create a mock post with comments
 */
export function createMockPostWithComments(commentsCount: number = 5): Post {
  return createMockPost({ commentsCount });
}

/**
 * Create a mock FeedQueryResponse (Relay-style pagination)
 */
export function createMockFeedQueryResponse(
  posts: Post[] = [],
  hasNextPage: boolean = false
): FeedQueryResponse {
  return {
    exploreFeed: {
      edges: posts.map((post, index) => ({
        node: post,
        cursor: Buffer.from(`cursor-${index}`).toString('base64'),
      })),
      pageInfo: {
        hasNextPage,
        hasPreviousPage: false,
        startCursor: posts.length > 0 ? Buffer.from('cursor-0').toString('base64') : undefined,
        endCursor:
          posts.length > 0
            ? Buffer.from(`cursor-${posts.length - 1}`).toString('base64')
            : undefined,
      },
    },
  };
}

/**
 * Create a mock LikeResponse
 */
export interface MockLikeResponse {
  success: boolean;
  likesCount: number;
  isLiked: boolean;
}

export function createMockLikeResponse(
  overrides: Partial<MockLikeResponse> = {}
): MockLikeResponse {
  return {
    success: true,
    likesCount: 1,
    isLiked: true,
    ...overrides,
  };
}

export function createMockUnlikeResponse(
  overrides: Partial<MockLikeResponse> = {}
): MockLikeResponse {
  return {
    success: true,
    likesCount: 0,
    isLiked: false,
    ...overrides,
  };
}
