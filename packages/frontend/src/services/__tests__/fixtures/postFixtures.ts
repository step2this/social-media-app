/**
 * Post Test Fixtures
 *
 * Re-exports post fixtures from shared package and adds frontend-specific GraphQL wrappers.
 */

/**
 * Re-export core post builders from shared package
 */
export {
  createMockPost,
  createMockPosts,
  createMockPostWithLikes,
  createMockPostWithComments,
  createMockPostByUser,
  createMockPostConnection,
} from '@social-media-app/shared/test-utils';

/**
 * Create test data for CreatePostInput (frontend-specific GraphQL input)
 */
export function createMockCreatePostInput(
  overrides: Partial<{ fileType: string; caption?: string }> = {}
) {
  return {
    fileType: 'image/jpeg',
    caption: 'New post caption',
    ...overrides,
  };
}

/**
 * Create test data for UpdatePostInput (frontend-specific GraphQL input)
 */
export function createMockUpdatePostInput(
  overrides: Partial<{ caption?: string }> = {}
) {
  return {
    caption: 'Updated post caption',
    ...overrides,
  };
}
