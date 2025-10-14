/**
 * Service Factory
 *
 * Dependency injection pattern for DAL services in GraphQL context.
 * Creates services once per request and eliminates ~400 lines of duplicated code.
 *
 * Pattern Benefits:
 * - Single source of truth for service instantiation
 * - Consistent dependency injection across all resolvers
 * - Reduced code duplication (~400 lines eliminated)
 * - Centralized AWS configuration management
 * - Proper service lifecycle management per request
 *
 * Service Dependencies:
 * - ProfileService: Requires S3 and CloudFront configuration for media handling
 * - PostService: Depends on ProfileService for author data enrichment
 * - LikeService, FollowService, CommentService: Independent services
 */

import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  ProfileService,
  PostService,
  LikeService,
  FollowService,
  CommentService,
} from '@social-media-app/dal';
import {
  createS3Client,
  getS3BucketName,
  getCloudFrontDomain,
} from '@social-media-app/aws-utils';

/**
 * Services interface
 * All DAL services available in GraphQL context
 */
export interface Services {
  profileService: ProfileService;
  postService: PostService;
  likeService: LikeService;
  followService: FollowService;
  commentService: CommentService;
}

/**
 * Create all DAL services with proper dependency injection
 *
 * This factory creates all service instances needed for GraphQL operations.
 * Services are created once per request and shared across all resolvers
 * in that request context.
 *
 * Service Creation Order:
 * 1. ProfileService - Created first as it's needed by PostService
 * 2. PostService - Created with ProfileService dependency
 * 3. Other services - Created independently
 *
 * @param dynamoClient - DynamoDB document client from context
 * @param tableName - DynamoDB table name from context
 * @returns Services object with all instantiated DAL services
 *
 * @example
 * ```typescript
 * // In GraphQL context creation
 * const services = createServices(dynamoClient, tableName);
 * return { ...baseContext, services };
 * ```
 */
export function createServices(
  dynamoClient: DynamoDBDocumentClient,
  tableName: string
): Services {
  // Initialize AWS clients and configuration
  // These utilities handle environment-specific configuration (LocalStack vs AWS)
  const s3Client = createS3Client();
  const s3BucketName = getS3BucketName();
  const cloudFrontDomain = getCloudFrontDomain();

  /**
   * Create ProfileService first
   * ProfileService handles user profiles and media URLs
   * It needs S3 and CloudFront configuration for avatar/media handling
   */
  const profileService = new ProfileService(
    dynamoClient,
    tableName,
    s3BucketName,
    cloudFrontDomain,
    s3Client
  );

  /**
   * Create PostService with ProfileService dependency
   * PostService enriches posts with author profile data
   * Reusing the same ProfileService instance ensures:
   * - Consistent profile data across operations
   * - Efficient resource usage (single S3 client)
   * - Proper dependency injection pattern
   */
  const postService = new PostService(
    dynamoClient,
    tableName,
    profileService  // Inject ProfileService dependency
  );

  /**
   * Create remaining independent services
   * These services don't have inter-service dependencies
   */
  const likeService = new LikeService(dynamoClient, tableName);
  const followService = new FollowService(dynamoClient, tableName);
  const commentService = new CommentService(dynamoClient, tableName);

  /**
   * Return all services as a cohesive unit
   * These services will be available via context.services in all resolvers
   */
  return {
    profileService,
    postService,
    likeService,
    followService,
    commentService,
  };
}
