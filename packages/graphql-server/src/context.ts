import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { AwilixContainer } from 'awilix';
import { createDynamoDBClient, getTableName } from '@social-media-app/aws-utils';
import { verifyAccessToken, extractTokenFromHeader, getJWTConfigFromEnv } from '@social-media-app/auth-utils';
import { createLoaders, type DataLoaders } from './dataloaders/index.js';
import { createServices, type Services } from './services/factory.js';
import { createGraphQLContainer, type GraphQLContainer } from './infrastructure/di/awilix-container.js';

/**
 * GraphQL Context
 * Available to all resolvers via the context parameter
 */
export interface GraphQLContext {
  // Authentication
  userId: string | null;

  // Distributed tracing
  correlationId: string;

  // AWS Clients
  dynamoClient: DynamoDBDocumentClient;
  tableName: string;

  // DAL Services (dependency injection - eliminates instantiation duplication)
  services: Services;

  // DataLoaders for batching and caching queries (solves N+1 problem)
  loaders: DataLoaders;

  // Awilix DI Container (created once per request for clean architecture resolvers)
  container: AwilixContainer<GraphQLContainer>;
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

  // Generate correlation ID for distributed tracing
  const correlationId = event.requestContext?.requestId || `gql-${Date.now()}-${Math.random()}`;

  // Create all DAL services using factory pattern (eliminates duplication)
  const services = createServices(dynamoClient, tableName);

  // Create DataLoaders for batching and caching (solves N+1 query problem)
  const loaders = createLoaders(
    {
      profileService: services.profileService,
      postService: services.postService,
      likeService: services.likeService,
      auctionService: services.auctionService,
    },
    userId
  );

  // Create context object (needed for createGraphQLContainer)
  const context: GraphQLContext = {
    userId,
    correlationId,
    dynamoClient,
    tableName,
    services,
    loaders,
  } as GraphQLContext;

  // Create Awilix DI container once per request
  // This replaces the old custom Container + registerServices pattern
  const container = createGraphQLContainer(context);
  context.container = container;

  return context;
}
