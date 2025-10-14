import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createDynamoDBClient, getTableName } from '@social-media-app/aws-utils';
import { verifyAccessToken, extractTokenFromHeader, getJWTConfigFromEnv } from '@social-media-app/auth-utils';

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

  // DataLoaders (will be added in next phase)
  // dataloaders: {
  //   profileLoader: DataLoader<string, Profile>;
  //   postLoader: DataLoader<string, Post>;
  //   likeStatusLoader: DataLoader<string, boolean>;
  //   followStatusLoader: DataLoader<string, boolean>;
  // };
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

  return {
    userId,
    dynamoClient,
    tableName
  };
}
