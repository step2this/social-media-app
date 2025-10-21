/**
 * Test Fixtures for Like Service
 *
 * Factory functions following the DRY pattern for creating consistent test data.
 * Each factory provides sensible defaults with the ability to override specific fields.
 */

import type { LikeResponse, LikeStatus } from '../../../graphql/operations/likes';

/**
 * Create a mock like response
 */
export function createMockLikeResponse(
  overrides: Partial<LikeResponse> = {}
): LikeResponse {
  return {
    success: true,
    likesCount: 1,
    isLiked: true,
    ...overrides,
  };
}

/**
 * Create a mock unlike response
 */
export function createMockUnlikeResponse(
  overrides: Partial<LikeResponse> = {}
): LikeResponse {
  return {
    success: true,
    likesCount: 0,
    isLiked: false,
    ...overrides,
  };
}

/**
 * Create a mock like status
 */
export function createMockLikeStatus(
  overrides: Partial<LikeStatus> = {}
): LikeStatus {
  return {
    isLiked: false,
    likesCount: 0,
    ...overrides,
  };
}

/**
 * Create a mock like status for a liked post
 */
export function createMockLikedStatus(
  likesCount: number = 5
): LikeStatus {
  return createMockLikeStatus({
    isLiked: true,
    likesCount,
  });
}

/**
 * Create a mock like status for an unliked post
 */
export function createMockUnlikedStatus(
  likesCount: number = 0
): LikeStatus {
  return createMockLikeStatus({
    isLiked: false,
    likesCount,
  });
}
