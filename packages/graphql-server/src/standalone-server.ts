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

import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
// import { typeDefs } from './schema/typeDefs.js'; // TODO: Create typeDefs file
import { resolvers } from './schema/resolvers/index.js';
import depthLimit from 'graphql-depth-limit';
import type { GraphQLContext } from './context.js';
import { createDynamoDBClient, getTableName } from '@social-media-app/aws-utils';
import { verifyAccessToken, extractTokenFromHeader, getJWTConfigFromEnv } from '@social-media-app/auth-utils';
import { createLoaders } from './dataloaders/index.js';
import { createServices } from './services/factory.js';
import { createGraphQLContainer } from './infrastructure/di/index.js';

// Load environment variables from project root
config({ path: '../../.env' });

// TODO: Create proper typeDefs file - this is a minimal placeholder
const typeDefs = `#graphql
  type Query {
    _placeholder: String
  }
`;

const app = express();
const PORT = process.env.GRAPHQL_PORT || 4000;

/**
 * Create GraphQL context from Express request
 * Similar to createContext() but works with Express Request instead of Lambda Event
 */
async function createExpressContext({ req }: { req: express.Request }): Promise<GraphQLContext> {
  // Initialize DynamoDB client using aws-utils
  const dynamoClient = createDynamoDBClient();
  const tableName = getTableName();

  // Extract and verify JWT token using auth-utils
  let userId: string | null = null;
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

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

  // Create context object (needed for registerServices)
  const context: GraphQLContext = {
    userId,
    dynamoClient,
    tableName,
    services,
    loaders,
  } as GraphQLContext;

  // TODO: Create DI container once proper Container/registerServices are implemented
  // const container = createGraphQLContainer(context);
  // context.container = container;

  return context;
}

/**
 * Initialize and start Apollo Server
 */
async function startServer() {
  try {
    console.log('🚀 Starting GraphQL server for LocalStack development...\n');

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

    // Create Apollo Server
    const server = new ApolloServer<GraphQLContext>({
      typeDefs,
      resolvers,

      // Security: Query depth and complexity limits
      validationRules: [
        depthLimit(7), // Max query depth of 7 levels
      ],

      // Development features (introspection, playground, stack traces)
      introspection: true,
      includeStacktraceInErrorResponses: true,

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

    // Start Apollo Server
    await server.start();
    console.log('✅ Apollo Server started\n');

    // Configure Express middleware
    app.use(cors({
      origin: ['http://localhost:3000', 'http://localhost:5173'], // Frontend origins
      credentials: true,
    }));

    app.use(express.json({ limit: '10mb' })); // Match API Gateway 10MB limit

    // Health check endpoint
    app.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        service: 'graphql-server',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
    });

    // Apply Apollo GraphQL middleware
    app.use(
      '/graphql',
      expressMiddleware(server, {
        context: createExpressContext,
      })
    );

    // Start Express server
    app.listen(PORT, () => {
      console.log('🎉 GraphQL server ready!\n');
      console.log(`   GraphQL endpoint: http://localhost:${PORT}/graphql`);
      console.log(`   Health check:     http://localhost:${PORT}/health`);
      console.log('');
      console.log('📝 Example queries:');
      console.log(`   curl -X POST http://localhost:${PORT}/graphql \\`);
      console.log(`     -H "Content-Type: application/json" \\`);
      console.log(`     -d '{"query": "{ __typename }"}'`);
      console.log('');
      console.log('💡 GraphQL Playground:');
      console.log(`   Open http://localhost:${PORT}/graphql in your browser`);
      console.log('');
    });

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
