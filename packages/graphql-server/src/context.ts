import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createDynamoDBClient, getTableName } from '@social-media-app/aws-utils';
import { verifyAccessToken, extractTokenFromHeader, getJWTConfigFromEnv } from '@social-media-app/auth-utils';
import { createS3Client, getS3BucketName, getCloudFrontDomain } from '@social-media-app/aws-utils';
import { ProfileService, PostService, LikeService } from '@social-media-app/dal';
import { createLoaders, type DataLoaders } from './dataloaders/index.js';

/**
 * GraphQL Context
 * Available to all resolvers via the context parameter
 */
export interface GraphQLContext {
  // Authentication
  userId: string | null;

  // AWS Clients
  dynamoClient: DynamoDBDocumentClient;
  tableName: string;

  // DataLoaders for batching and caching queries (solves N+1 problem)
  loaders: DataLoaders;
}

/**
 * Create GraphQL context from Lambda event
 * Extracts authentication, initializes AWS clients, creates DataLoaders
 */
export async function createContext(
  event: APIGatewayProxyEventV2
): Promise<GraphQLContext> {
  // Initialize DynamoDB client using aws-utils
  const dynamoClient = createDynamoDBClient();
  const tableName = getTableName();

  // Extract and verify JWT token using auth-utils
  let userId: string | null = null;
  const token = extractTokenFromHeader(event.headers?.authorization);

  if (token) {
    try {
      const jwtConfig = getJWTConfigFromEnv();
      const payload = await verifyAccessToken(token, jwtConfig.secret);
      userId = payload?.userId || null;
    } catch (error) {
      // Log error but don't throw - allow request to continue as unauthenticated
      console.warn('JWT verification failed in GraphQL context:', error instanceof Error ? error.message : String(error));
    }
  }

  // Initialize S3 client and configuration
  const s3Client = createS3Client();
  const s3BucketName = getS3BucketName();
  const cloudFrontDomain = getCloudFrontDomain();

  // Initialize DAL services (per-request instances for proper isolation)
  const profileService = new ProfileService(
    dynamoClient,
    tableName,
    s3BucketName,
    cloudFrontDomain,
    s3Client
  );
  const postService = new PostService(dynamoClient, tableName, profileService);
  const likeService = new LikeService(dynamoClient, tableName);

  // Create DataLoaders for batching and caching (solves N+1 query problem)
  const loaders = createLoaders(
    {
      profileService,
      postService,
      likeService,
    },
    userId
  );

  return {
    userId,
    dynamoClient,
    tableName,
    loaders,
  };
}
