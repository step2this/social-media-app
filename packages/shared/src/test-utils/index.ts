/**
 * @fileoverview Test Utilities Barrel Export
 *
 * This module exports all shared test utilities for use across the monorepo.
 * These utilities eliminate code duplication in test files and provide
 * consistent, well-tested mock implementations.
 *
 * @module @social-media-app/shared/test-utils
 */

export {
  createMockDynamoClient,
  setupS3Mocks,
  createMockAPIGatewayEvent,
  createMockJWT,
  isConditionalCheckFailedException,
  convertToAttributeValue,
  createMockDynamoDBStreamRecord,
  createMockDynamoDBStreamEvent,
  type MockDynamoClientOptions,
  type MockDynamoCommand,
  type MockDynamoClient,
  type S3MockConfig,
  type APIGatewayEventConfig,
  type DynamoDBStreamRecordConfig,
  type DynamoDBStreamEventConfig
} from './aws-mocks.js';

export {
  errorScenarios,
  type ErrorScenario
} from './error-scenarios.js';

export {
  createMockProfile,
  createMockPublicProfile,
  createMockProfiles,
  mockOwnProfile,
  mockFollowedProfile,
  mockUnfollowedProfile,
  createMockSeller,
  createMockBidder,
  createMockWinner
} from './fixtures/profile-fixtures.js';

export {
  createMockPost,
  createMockPosts,
  createMockPostGridItem,
  createMockPostGridItems,
  createMockPostWithAuthor,
  createMockPostsWithAuthor,
  createMockPostWithLikes,
  createMockPostWithComments,
  createMockPostByUser,
  createMockPostWithAuthorByUser,
  createMockPostConnection
} from './fixtures/post-fixtures.js';

export {
  createMockExploreFeed,
  createMockFollowingFeed,
  createMockEmptyExploreFeed,
  createMockEmptyFollowingFeed,
  createMockExploreFeedWithPostIds,
  createMockFollowingFeedWithPostIds,
  createMockMarkPostsAsReadInput,
  createMockMarkPostsAsReadResult
} from './fixtures/feed-fixtures.js';

export {
  createMockComment,
  createMockComments,
  type MockComment
} from './fixtures/comment-fixtures.js';

export {
  createMockFollowStatus,
  createMockFollowing,
  createMockNotFollowing,
  type MockFollowStatus
} from './fixtures/follow-fixtures.js';

export {
  createMockLikeStatus,
  createMockLiked,
  createMockNotLiked,
  type MockLikeStatus
} from './fixtures/like-fixtures.js';

export {
  type GraphQLResult,
  type SingleResult,
  type GraphQLErrorResponse,
  assertSingleResult,
  assertNoErrors,
  assertHasErrors,
  hasErrorCode,
  getFirstErrorCode,
  getAllErrorCodes,
  extractData,
  extractErrors
} from './graphql/response-types.js';

export {
  createSuccessResponse,
  createErrorResponse,
  createMultiErrorResponse,
  createPartialResponse,
  createSingleResult
} from './graphql/response-builders.js';
