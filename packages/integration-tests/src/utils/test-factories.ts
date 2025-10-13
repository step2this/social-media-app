/**
 * Test Factory Functions for Integration Tests
 *
 * Provides DRY factory functions for creating test users and posts that are
 * repeated across all integration test files. This eliminates boilerplate
 * and ensures consistency across test suites.
 *
 * @module test-factories
 */

import { randomUUID } from 'crypto';
import type {
  RegisterResponse,
  CreatePostResponse,
  Post,
  Profile
} from '@social-media-app/shared';
import {
  RegisterResponseSchema,
  CreatePostResponseSchema,
  ProfileResponseSchema
} from '@social-media-app/shared';
import type { HttpClient } from './http-client.js';
import { parseResponse } from './http-client.js';
import { delay, authHeader } from './helpers.js';
import {
  createRegisterRequest,
  createPostRequest
} from '../fixtures/index.js';

/**
 * Test user data returned from createTestUser factory
 *
 * @property token - JWT access token for authentication
 * @property userId - Unique user identifier (UUID)
 * @property email - User's email address
 * @property username - User's username
 * @property handle - User's handle (fetched from profile endpoint)
 */
export interface TestUser {
  token: string;
  userId: string;
  email: string;
  username: string;
  handle?: string;
}

/**
 * Test post data returned from createTestPost factory
 *
 * @property postId - Unique post identifier (UUID)
 * @property post - Full post object with metadata
 */
export interface TestPost {
  postId: string;
  post: Post;
}

/**
 * Options for createTestUser factory
 *
 * @property prefix - Prefix for email/username to namespace tests (e.g., 'likes-test')
 * @property email - Override default email generation
 * @property username - Override default username generation
 * @property password - Password for user account (defaults to 'TestPassword123!')
 */
export interface CreateTestUserOptions {
  prefix?: string;
  email?: string;
  username?: string;
  password?: string;
}

/**
 * Options for createTestPost factory
 *
 * @property caption - Post caption text
 * @property tags - Array of tag strings
 * @property isPublic - Whether post is public (default: true)
 * @property waitForStreams - Wait 3s for stream processors to complete (default: false)
 */
export interface CreateTestPostOptions {
  caption?: string;
  tags?: string[];
  isPublic?: boolean;
  waitForStreams?: boolean;
}

/**
 * Options for createTestUsers bulk factory
 *
 * @property prefix - Prefix for all usernames/emails to namespace tests
 * @property count - Number of users to create
 * @property password - Password for all user accounts (defaults to 'TestPassword123!')
 */
export interface CreateTestUsersOptions {
  prefix?: string;
  count: number;
  password?: string;
}

/**
 * Create a test user with registration and authentication
 *
 * Handles the complete user registration workflow:
 * 1. Generates unique ID for email/username
 * 2. Builds registration request with builder pattern
 * 3. POSTs to /auth/register endpoint
 * 4. Parses and validates response with Zod schema
 * 5. Fetches user profile to retrieve handle
 * 6. Returns token, userId, and handle for subsequent requests
 *
 * @param httpClient - HTTP client instance for making API calls
 * @param options - Optional configuration for user creation
 * @returns TestUser object with token, user metadata, and handle
 *
 * @example
 * ```typescript
 * const user = await createTestUser(httpClient, {
 *   prefix: 'likes-test'
 * });
 * // Result: user.email = 'likes-test-user-abc123@tamafriends.local'
 * // Result: user.handle = 'likestestuser_abc123'
 * ```
 *
 * @example
 * ```typescript
 * const user = await createTestUser(httpClient, {
 *   email: 'specific@example.com',
 *   username: 'specificuser'
 * });
 * ```
 */
export async function createTestUser(
  // eslint-disable-next-line functional/prefer-immutable-types
  httpClient: HttpClient,
  options: Readonly<CreateTestUserOptions> = {}
): Promise<TestUser> {
  const {
    prefix = 'test',
    email: customEmail,
    username: customUsername,
    password = 'TestPassword123!'
  } = options;

  // Generate unique ID for this test user
  const uniqueId = randomUUID().slice(0, 8);

  // Build email and username with prefix
  const email = customEmail || `${prefix}-user-${uniqueId}@tamafriends.local`;
  const username = customUsername || `${prefix.replace(/-/g, '')}user_${uniqueId}`;

  // Build registration request using builder pattern
  const registerRequest = createRegisterRequest()
    .withEmail(email)
    .withUsername(username)
    .withPassword(password)
    .build();

  // Register user via API
  const registerResponse = await httpClient.post<RegisterResponse>(
    '/auth/register',
    registerRequest
  );

  // Parse and validate response
  const registerData = await parseResponse(registerResponse, RegisterResponseSchema);

  // Extract authentication token and user metadata
  const token = registerData.tokens!.accessToken;
  const userId = registerData.user.id;

  // Fetch profile to get handle
  const profileResponse = await httpClient.get<{ profile: Profile }>(
    '/profile/me',
    authHeader(token)
  );
  const profileData = await parseResponse(profileResponse, ProfileResponseSchema);
  const handle = profileData.profile.handle;

  return {
    token,
    userId,
    email,
    username,
    handle
  };
}

/**
 * Create a test post for an authenticated user
 *
 * Handles the complete post creation workflow:
 * 1. Builds post request with builder pattern
 * 2. POSTs to /posts endpoint with authorization
 * 3. Parses and validates response with Zod schema
 * 4. Optionally waits for stream processors to complete
 *
 * **Note on Stream Processing:**
 * When `waitForStreams: true`, this function waits 3 seconds for
 * DynamoDB Stream processors to update counts (likesCount, commentsCount).
 * Without this delay, counts will be 0 immediately after creation.
 *
 * @param httpClient - HTTP client instance for making API calls
 * @param token - JWT access token for authentication
 * @param options - Optional configuration for post creation
 * @returns TestPost object with postId and full post metadata
 *
 * @example
 * ```typescript
 * const { postId } = await createTestPost(httpClient, user.token, {
 *   caption: 'Test post for likes',
 *   tags: ['test', 'integration'],
 *   waitForStreams: true
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Quick post creation without waiting for streams
 * const { post } = await createTestPost(httpClient, user.token);
 * ```
 */
export async function createTestPost(
  // eslint-disable-next-line functional/prefer-immutable-types
  httpClient: HttpClient,
  token: string,
  options: Readonly<CreateTestPostOptions> = {}
): Promise<TestPost> {
  const {
    caption = 'Test post caption',
    tags = ['test', 'integration'],
    isPublic = true,
    waitForStreams = false
  } = options;

  // Build post request using builder pattern with visibility
  const postRequestBuilder = createPostRequest()
    .withCaption(caption)
    .withTags(tags);

  // Set visibility and build request
  const postRequest = (isPublic
    ? postRequestBuilder.asPublic()
    : postRequestBuilder.asPrivate()
  ).build();

  // Create post via API with authorization
  const createPostResponse = await httpClient.post<CreatePostResponse>(
    '/posts',
    postRequest,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  // Parse and validate response
  const createPostData = await parseResponse(createPostResponse, CreatePostResponseSchema);

  // Wait for stream processors if requested
  if (waitForStreams) {
    await delay(3000);
  }

  // Extract post data - schema validation ensures correct shape
  const post: Post = {
    ...createPostData.post,
    tags: createPostData.post.tags ?? [],
    likesCount: createPostData.post.likesCount ?? 0,
    commentsCount: createPostData.post.commentsCount ?? 0,
    isPublic: createPostData.post.isPublic ?? true
  };

  return {
    postId: post.id,
    post
  };
}

/**
 * Create multiple test users in parallel
 *
 * Efficiently creates multiple users using Promise.all for parallel execution.
 * All users share the same prefix for easy identification in test scenarios.
 *
 * @param httpClient - HTTP client instance for making API calls
 * @param options - Configuration including count and optional prefix
 * @returns Array of TestUser objects
 *
 * @example
 * ```typescript
 * // Create 3 users for follow testing
 * const [user1, user2, user3] = await createTestUsers(httpClient, {
 *   prefix: 'follow-test',
 *   count: 3
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Create 5 users with custom password
 * const users = await createTestUsers(httpClient, {
 *   prefix: 'bulk-test',
 *   count: 5,
 *   password: 'CustomPassword123!'
 * });
 * ```
 */
export async function createTestUsers(
  // eslint-disable-next-line functional/prefer-immutable-types
  httpClient: HttpClient,
  options: Readonly<CreateTestUsersOptions>
): Promise<TestUser[]> {
  const { prefix = 'test', count, password = 'TestPassword123!' } = options;

  // Create array of promises for parallel execution
  const userPromises = Array.from({ length: count }, () =>
    createTestUser(httpClient, { prefix, password })
  );

  // Execute all user registrations in parallel
  return Promise.all(userPromises);
}

/**
 * Create multiple test posts for a user in parallel
 *
 * Efficiently creates multiple posts using Promise.all for parallel execution.
 * Useful for setting up test scenarios requiring multiple posts.
 *
 * @param httpClient - HTTP client instance for making API calls
 * @param token - JWT access token for authentication
 * @param count - Number of posts to create
 * @param options - Optional configuration for post creation
 * @returns Array of TestPost objects
 *
 * @example
 * ```typescript
 * // Create 5 posts for feed testing
 * const posts = await createTestPosts(httpClient, user.token, 5, {
 *   waitForStreams: true
 * });
 * ```
 */
export async function createTestPosts(
  // eslint-disable-next-line functional/prefer-immutable-types
  httpClient: HttpClient,
  token: string,
  count: number,
  options: Readonly<CreateTestPostOptions> = {}
): Promise<TestPost[]> {
  // Create array of promises for parallel execution
  const postPromises = Array.from({ length: count }, (_, index) =>
    createTestPost(httpClient, token, {
      ...options,
      caption: options.caption || `Test post ${index + 1}`
    })
  );

  // Execute all post creations in parallel
  return Promise.all(postPromises);
}
