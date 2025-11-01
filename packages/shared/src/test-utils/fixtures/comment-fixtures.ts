/**
 * Comment Test Fixtures
 *
 * Lean test data builders for comment entities.
 */

export interface MockComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
}

/**
 * Creates a single mock comment with optional overrides.
 */
export function createMockComment(overrides: Partial<MockComment> = {}): MockComment {
  return {
    id: `comment-${Math.random().toString(36).slice(2, 9)}`,
    postId: 'post-1',
    userId: 'user-1',
    content: 'Test comment',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates an array of mock comments.
 */
export function createMockComments(count: number, overrides?: Partial<MockComment>): MockComment[] {
  return Array.from({ length: count }, (_, i) =>
    createMockComment({
      id: `comment-${i + 1}`,
      content: `Comment ${i + 1}`,
      ...overrides,
    })
  );
}
