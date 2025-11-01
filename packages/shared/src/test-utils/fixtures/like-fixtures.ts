/**
 * Like Test Fixtures
 *
 * Lean test data builders for like status entities.
 */

export interface MockLikeStatus {
  isLiked: boolean;
  likeCount: number;
}

/**
 * Creates a mock like status with optional overrides.
 */
export function createMockLikeStatus(overrides: Partial<MockLikeStatus> = {}): MockLikeStatus {
  return {
    isLiked: false,
    likeCount: 0,
    ...overrides,
  };
}

/**
 * Creates a liked status (convenience helper).
 */
export function createMockLiked(likeCount: number = 1): MockLikeStatus {
  return createMockLikeStatus({ isLiked: true, likeCount });
}

/**
 * Creates a not-liked status (convenience helper).
 */
export function createMockNotLiked(): MockLikeStatus {
  return createMockLikeStatus({ isLiked: false });
}
