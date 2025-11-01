/**
 * Follow Test Fixtures
 *
 * Lean test data builders for follow status entities.
 */

export interface MockFollowStatus {
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
}

/**
 * Creates a mock follow status with optional overrides.
 */
export function createMockFollowStatus(
  overrides: Partial<MockFollowStatus> = {}
): MockFollowStatus {
  return {
    isFollowing: false,
    followersCount: 0,
    followingCount: 0,
    ...overrides,
  };
}

/**
 * Creates a following status (convenience helper).
 */
export function createMockFollowing(): MockFollowStatus {
  return createMockFollowStatus({ isFollowing: true });
}

/**
 * Creates a not-following status (convenience helper).
 */
export function createMockNotFollowing(): MockFollowStatus {
  return createMockFollowStatus({ isFollowing: false });
}
