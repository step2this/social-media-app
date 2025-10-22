/**
 * Comment Test Fixtures
 *
 * Factory functions for creating comment test data.
 * Follows DRY pattern with sensible defaults and easy overrides.
 */

import type { Comment } from '@social-media-app/shared';

/**
 * Create a mock comment with sensible defaults
 */
export function createMockComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 'comment-1',
    postId: 'post-1',
    userId: 'user-1',
    userHandle: 'testuser',
    content: 'This is a test comment',
    createdAt: '2025-01-01T12:00:00Z',
    updatedAt: '2025-01-01T12:00:00Z',
    ...overrides,
  };
}

/**
 * Create multiple mock comments
 */
export function createMockComments(
  count: number,
  postId = 'post-1'
): Comment[] {
  return Array.from({ length: count }, (_, index) =>
    createMockComment({
      id: `comment-${index + 1}`,
      postId,
      userId: `user-${index + 1}`,
      userHandle: `user${index + 1}`,
      content: `Test comment ${index + 1}`,
      createdAt: new Date(
        Date.now() - (count - index) * 60000
      ).toISOString(),
    })
  );
}

/**
 * Create a comment by a specific user
 */
export function createMockCommentByUser(
  userId: string,
  userHandle: string,
  overrides: Partial<Comment> = {}
): Comment {
  return createMockComment({
    userId,
    userHandle,
    ...overrides,
  });
}

/**
 * Create input for creating a comment
 */
export function createMockCreateCommentInput(overrides: {
  postId?: string;
  content?: string;
} = {}) {
  return {
    postId: 'post-1',
    content: 'This is a test comment',
    ...overrides,
  };
}

/**
 * Create a response for creating a comment
 */
export function createMockCreateCommentResponse(overrides: {
  comment?: Partial<Comment>;
  commentsCount?: number;
} = {}) {
  return {
    comment: createMockComment(overrides.comment),
    commentsCount: overrides.commentsCount ?? 1,
  };
}

/**
 * Create a paginated comments list response
 */
export function createMockCommentsListResponse(
  comments: Comment[],
  hasMore = false,
  totalCount?: number
) {
  return {
    comments,
    hasMore,
    nextCursor: hasMore ? `cursor-${comments.length}` : null,
    totalCount: totalCount ?? comments.length,
  };
}
