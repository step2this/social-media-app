/**
 * Awilix Container for Test Data Builders
 *
 * Follows the same Awilix pattern used in packages/graphql-server
 * for dependency injection. Provides centralized access to all DAL
 * services used by builders.
 *
 * Architecture:
 * - DAL Services (singleton values from context.services)
 * - Builder-specific utilities (if needed)
 *
 * @module builders/base
 */

import type { AwilixContainer } from 'awilix';
import { createContainer, asValue, InjectionMode } from 'awilix';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createDynamoDBClient, getTableName } from '@social-media-app/aws-utils';

// Import DAL service types
import type { LikeService } from '@social-media-app/dal';
import type { PostService } from '@social-media-app/dal';
import type { ProfileService } from '@social-media-app/dal';
import type { CommentService } from '@social-media-app/dal';
import type { FollowService } from '@social-media-app/dal';
import type { FeedService } from '@social-media-app/dal';

// ============================================================================
// Container Interface
// ============================================================================

/**
 * Builder Container - all resolvable dependencies for builders
 *
 * This interface provides type safety for container.resolve() calls.
 * Matches the pattern from graphql-server/awilix-container.ts
 */
export interface BuilderContainer {
  // DAL Services
  likeService: LikeService;
  postService: PostService;
  profileService: ProfileService;
  commentService: CommentService;
  followService: FollowService;
  feedService: FeedService;

  // Infrastructure
  dynamoClient: DynamoDBDocumentClient;
  tableName: string;
}

/**
 * Configuration for creating builder container
 */
export interface BuilderContainerConfig {
  /**
   * DynamoDB table name (if not provided, uses environment default)
   */
  tableName?: string;

  /**
   * Custom DynamoDB client (if not provided, creates new one)
   */
  dynamoClient?: DynamoDBDocumentClient;
}

// ============================================================================
// Container Creation
// ============================================================================

/**
 * Create Awilix container for test data builders
 *
 * This function sets up the complete dependency graph for builders.
 * All DAL services are registered as singleton values.
 *
 * @param config - Optional configuration
 * @returns Configured Awilix container with all dependencies
 *
 * @example
 * ```typescript
 * // In builder:
 * const container = await createBuilderContainer();
 * const likeService = container.resolve('likeService');
 * await likeService.likePost(userId, postId, ...);
 *
 * // Cleanup when done:
 * container.dispose();
 * ```
 */
export async function createBuilderContainer(
  config: BuilderContainerConfig = {}
): Promise<AwilixContainer<BuilderContainer>> {
  const container = createContainer<BuilderContainer>({
    // CLASSIC mode: Use constructor parameter names for injection
    injectionMode: InjectionMode.CLASSIC,
  });

  // Initialize DynamoDB client
  const dynamoClient = config.dynamoClient || createDynamoDBClient();
  const tableName = config.tableName || getTableName();

  // Import services dynamically from the DAL package
  const { LikeService } = await import('@social-media-app/dal');
  const { PostService } = await import('@social-media-app/dal');
  const { ProfileService } = await import('@social-media-app/dal');
  const { CommentService } = await import('@social-media-app/dal');
  const { FollowService } = await import('@social-media-app/dal');
  const { FeedService } = await import('@social-media-app/dal');

  // Create service instances
  const profileService = new ProfileService(dynamoClient, tableName);
  const postService = new PostService(dynamoClient, tableName, profileService);
  const likeService = new LikeService(dynamoClient, tableName);
  const commentService = new CommentService(dynamoClient, tableName);
  const followService = new FollowService(dynamoClient, tableName);
  const feedService = new FeedService(dynamoClient, tableName);

  // Register all services as singleton values
  container.register({
    // DAL Services
    likeService: asValue(likeService),
    postService: asValue(postService),
    profileService: asValue(profileService),
    commentService: asValue(commentService),
    followService: asValue(followService),
    feedService: asValue(feedService),

    // Infrastructure
    dynamoClient: asValue(dynamoClient),
    tableName: asValue(tableName),
  });

  return container;
}

/**
 * Type helper to extract container cradle type
 * Useful for builders that need multiple services
 */
export type BuilderContainerCradle = AwilixContainer<BuilderContainer>['cradle'];
