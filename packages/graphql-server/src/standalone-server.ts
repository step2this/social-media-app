#!/usr/bin/env node

/**
 * Standalone GraphQL Server for LocalStack Development
 *
 * This is a development server that runs Apollo Server with Express
 * for local testing with LocalStack. It mimics the Lambda/API Gateway
 * environment but runs as a standard Node.js HTTP server.
 *
 * Usage:
 *   pnpm dev:graphql (from project root)
 *   node src/standalone-server.ts (from graphql-server package)
 *
 * Environment Variables (required):
 *   - NODE_ENV: development
 *   - USE_LOCALSTACK: true
 *   - LOCALSTACK_ENDPOINT: http://localhost:4566
 *   - TABLE_NAME: DynamoDB table name
 *   - MEDIA_BUCKET_NAME: S3 bucket name
 *   - AWS_REGION: us-east-1
 *   - AWS_ACCESS_KEY_ID: test (for LocalStack)
 *   - AWS_SECRET_ACCESS_KEY: test (for LocalStack)
 *   - JWT_SECRET: your-development-jwt-secret-key-here
 *   - JWT_REFRESH_SECRET: your-development-jwt-refresh-secret-key-here
 *
 * Differences from Lambda handler:
 *   - Uses Express integration instead of Lambda integration
 *   - Starts server on port 4000 (separate from REST API on 3001)
 *   - GraphQL Playground enabled at http://localhost:4000/graphql
 *   - No API Gateway event conversion needed
 */

import { config } from 'dotenv';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { pothosSchema } from './schema/pothos/index.js';
import type { GraphQLContext } from './context.js';
import { createDynamoDBClient, getTableName } from '@social-media-app/aws-utils';
import { verifyAccessToken, extractTokenFromHeader, getJWTConfigFromEnv } from '@social-media-app/auth-utils';
import { createLoaders } from './dataloaders/index.js';
import { createServices } from './services/factory.js';
import { createGraphQLContainer } from './infrastructure/di/awilix-container.js';

// Load environment variables from project root
config({ path: '../../.env' });

const PORT = parseInt(process.env.GRAPHQL_PORT || '4000', 10);

/**
 * Create GraphQL context from standalone server request
 * Similar to createContext() but works with standalone server req object
 */
async function createStandaloneContext({ req }: { req: { headers: Record<string, string | string[] | undefined> } }): Promise<GraphQLContext> {
  // Initialize DynamoDB client using aws-utils
  const dynamoClient = createDynamoDBClient();
  const tableName = getTableName();

  // Extract and verify JWT token using auth-utils
  let userId: string | null = null;
  const authHeader = req.headers.authorization || req.headers.Authorization;
  // Handle string[] case (multiple authorization headers - take first one)
  const authHeaderStr = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const token = extractTokenFromHeader(authHeaderStr);

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

  // Create all DAL services using factory pattern
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

  // Create context object
  const context: GraphQLContext = {
    userId,
    dynamoClient,
    tableName,
    services,
    loaders,
  } as GraphQLContext;

  // Create DI container once per request
  const container = createGraphQLContainer(context);
  context.container = container;

  return context;
}

/**
 * Initialize and start Apollo Server
 */
async function startServer() {
  try {
    console.log('🚀 Starting GraphQL server with Pothos for LocalStack development...\n');

    // Verify required environment variables
    const requiredEnvVars = [
      'TABLE_NAME',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'AWS_REGION',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY'
    ];

    const missing = requiredEnvVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    console.log('📋 Configuration:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   USE_LOCALSTACK: ${process.env.USE_LOCALSTACK || 'false'}`);
    console.log(`   LOCALSTACK_ENDPOINT: ${process.env.LOCALSTACK_ENDPOINT || 'N/A'}`);
    console.log(`   TABLE_NAME: ${process.env.TABLE_NAME}`);
    console.log(`   MEDIA_BUCKET_NAME: ${process.env.MEDIA_BUCKET_NAME || 'N/A'}`);
    console.log(`   AWS_REGION: ${process.env.AWS_REGION}`);
    console.log('');

    // Create and start Apollo Server using Pothos schema
    const server = new ApolloServer<GraphQLContext>({
      schema: pothosSchema,

      // Development features (introspection, playground, stack traces)
      introspection: true,
      includeStacktraceInErrorResponses: true,

      // Request logging plugin for development
      plugins: [
        {
          async requestDidStart(requestContext) {
            const operationName = requestContext.request.operationName || 'anonymous';
            const query = requestContext.request.query || '';
            const operation = query.trim().split(/\s+/)[0]; // query, mutation, etc

            console.log(`📨 [GraphQL] ${operation} ${operationName}`);

            return {
              async willSendResponse(context) {
                const errors = context.response.body.kind === 'single' ? context.response.body.singleResult.errors : undefined;
                if (errors && errors.length > 0) {
                  console.log(`❌ [GraphQL] ${operationName} - Error:`, errors[0].message);
                } else {
                  console.log(`✅ [GraphQL] ${operationName} - Success`);
                }
              },
            };
          },
        },
      ],

      // Custom error formatting
      formatError: (formattedError) => {
        const message = formattedError.message.toLowerCase();

        // Check for depth limit errors
        if (message.includes('exceeds maximum operation depth') ||
            message.includes('exceeds maximum depth') ||
            message.includes('query depth')) {
          return {
            ...formattedError,
            extensions: {
              ...formattedError.extensions,
              code: 'GRAPHQL_VALIDATION_FAILED',
            },
          };
        }

        return formattedError;
      },
    });

    // Start standalone server (handles HTTP server, CORS, and routing automatically)
    const { url } = await startStandaloneServer(server, {
      listen: { port: PORT },
      context: createStandaloneContext,
    });

    console.log('🎉 GraphQL server ready!\n');
    console.log(`   GraphQL endpoint: ${url}`);
    console.log('');
    console.log('📝 Example queries:');
    console.log(`   curl -X POST ${url} \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"query": "{ __typename }"}'`);
    console.log('');
    console.log('💡 GraphQL Playground:');
    console.log(`   Open ${url} in your browser`);
    console.log('');

  } catch (error) {
    console.error('❌ Failed to start GraphQL server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down GraphQL server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down GraphQL server...');
  process.exit(0);
});

// Start the server
startServer();
