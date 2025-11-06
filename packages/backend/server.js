#!/usr/bin/env node

/**
 * Express server for LocalStack development
 * Routes API calls to Lambda handlers with LocalStack environment
 */

import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';

// Load environment variables FIRST - point to project root .env file
config({ path: '../../.env' });

// Store handlers to be loaded dynamically
let handlers = {};

/**
 * Load Lambda handlers dynamically after environment is configured
 */
async function loadHandlers() {
  try {
    console.log('📦 Loading Lambda handlers...');

    const handlerMappings = [
      // Auth handlers (REST-based JWT authentication)
      { name: 'authLogin', path: './dist/handlers/auth/login.js' },
      { name: 'authRegister', path: './dist/handlers/auth/register.js' },
      { name: 'authProfile', path: './dist/handlers/auth/profile.js' },
      { name: 'authLogout', path: './dist/handlers/auth/logout.js' },
      { name: 'authRefresh', path: './dist/handlers/auth/refresh.js' },
      
      // Utility handlers (health check, dev tools)
      { name: 'hello', path: './dist/handlers/hello.js' }
    ];

    for (const { name, path } of handlerMappings) {
      try {
        console.log(`🔍 Attempting to load handler: ${name} from ${path}`);
        const module = await import(path);
        console.log(`📦 Module imported for ${name}:`, Object.keys(module));

        if (!module.handler) {
          throw new Error(`Handler export not found in module. Available exports: ${Object.keys(module).join(', ')}`);
        }

        handlers[name] = module.handler;
        console.log(`✅ Successfully loaded handler: ${name}`);
      } catch (error) {
        console.error(`❌ Failed to load handler ${name} from ${path}:`);
        console.error(`   Error: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);

        // Create a fallback handler that returns an error
        handlers[name] = async () => ({
          statusCode: 501,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Handler not available',
            message: `Lambda handler ${name} could not be loaded: ${error.message}`
          })
        });
        console.log(`🔧 Created fallback handler for ${name}`);
      }
    }

    console.log(`📦 Loaded ${Object.keys(handlers).length} handlers`);
    return true;
  } catch (error) {
    console.error('❌ Failed to load handlers:', error);
    return false;
  }
}

const app = express();
const port = 3001;

// Middleware to capture raw body before JSON parsing (for Lambda compatibility)
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      req.rawBody = data;
      next();
    });
  } else {
    next();
  }
});

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Authentication middleware - extracts JWT and adds userId to context
 * Mimics Lambda authorizer behavior for local development
 */
app.use(async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.replace('Bearer ', '');

      // Import JWT utilities dynamically
      const { verifyAccessToken, getJWTConfigFromEnv } = await import('./dist/utils/index.js');
      const { secret } = getJWTConfigFromEnv();

      // Verify token and extract userId
      const decoded = await verifyAccessToken(token, secret);

      // Store userId in request for Lambda event creation
      req.authenticatedUserId = decoded.userId;
    } catch (error) {
      // Don't fail here - let the handler decide how to handle invalid tokens
      console.log('⚠️  Invalid or expired token:', error.message);
    }
  }

  next();
});

/**
 * Convert Express request/response to AWS Lambda format and back
 */
const createLambdaEvent = (req) => {
  const event = {
    requestContext: {
      http: {
        method: req.method,
        path: req.path
      },
      requestId: Math.random().toString(36).substring(7)
    },
    headers: req.headers,
    body: req.rawBody || undefined,
    pathParameters: req.params,
    queryStringParameters: req.query
  };

  // Add authorizer context if user is authenticated
  if (req.authenticatedUserId) {
    event.requestContext.authorizer = {
      userId: req.authenticatedUserId
    };
  }

  return event;
};

const sendLambdaResponse = (res, lambdaResult) => {
  res.status(lambdaResult.statusCode);

  if (lambdaResult.headers) {
    Object.entries(lambdaResult.headers).forEach(([key, value]) => {
      res.set(key, value);
    });
  }

  res.send(lambdaResult.body);
};

// Health check
app.get('/health', (req, res) => {
  console.log(`📥 ${req.method} ${req.path}`);
  res.json({
    status: 'healthy',
    mode: 'localstack-development',
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      USE_LOCALSTACK: process.env.USE_LOCALSTACK,
      TABLE_NAME: process.env.TABLE_NAME,
      LOCALSTACK_ENDPOINT: process.env.LOCALSTACK_ENDPOINT
    }
  });
});

// Dev endpoint: Cache status (only available in development/LocalStack mode)
if (process.env.NODE_ENV === 'development' || process.env.USE_LOCALSTACK === 'true') {
  app.get('/dev/cache-status', async (req, res) => {
    console.log(`📥 ${req.method} ${req.path}`);
    try {
      // Dynamically import the cache-status handler
      const { handler: cacheStatusHandler } = await import('./dist/handlers/dev/cache-status.js');

      // Create a Lambda event (no auth needed for dev endpoint)
      const event = createLambdaEvent(req);

      // Call the handler
      const result = await cacheStatusHandler(event);

      // Send Lambda response
      sendLambdaResponse(res, result);
    } catch (error) {
      console.error('Cache status handler error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Dev endpoint: Kinesis records monitoring
  app.get('/dev/kinesis-records', async (req, res) => {
    console.log(`📥 ${req.method} ${req.path}`);
    try {
      // Dynamically import the kinesis-records handler
      const { handler: kinesisRecordsHandler } = await import('./dist/handlers/dev/get-kinesis-records.js');

      // Create a Lambda event (no auth needed for dev endpoint)
      const event = createLambdaEvent(req);

      // Call the handler
      const result = await kinesisRecordsHandler(event);

      // Send Lambda response
      sendLambdaResponse(res, result);
    } catch (error) {
      console.error('Kinesis records handler error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

// Helper function to safely call handlers
const callHandler = async (handlerName, req, res) => {
  console.log(`📥 ${req.method} ${req.path}`);
  try {
    if (!handlers[handlerName]) {
      return res.status(501).json({
        error: 'Handler not loaded',
        message: `Lambda handler ${handlerName} is not available`
      });
    }

    const event = createLambdaEvent(req);
    const result = await handlers[handlerName](event);
    sendLambdaResponse(res, result);
  } catch (error) {
    console.error(`${handlerName} handler error:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// REST API Routes
// ============================================================================
// All business logic routes have been removed - use GraphQL for:
// - Posts, Feeds, Profiles, Likes, Comments, Follows, Notifications, Auctions
//
// Only auth and utility routes remain below:
// ============================================================================

// Auth routes (JWT-based authentication - remains REST)
app.post('/auth/login', (req, res) => callHandler('authLogin', req, res));
app.post('/auth/register', (req, res) => callHandler('authRegister', req, res));
app.get('/auth/profile', (req, res) => callHandler('authProfile', req, res));
app.put('/auth/profile', (req, res) => callHandler('authProfile', req, res));
app.post('/auth/logout', (req, res) => callHandler('authLogout', req, res));
app.post('/auth/refresh', (req, res) => callHandler('authRefresh', req, res));

// Utility routes
app.get('/hello', (req, res) => callHandler('hello', req, res));

// Catch-all for undefined routes (disabled for now due to Express 5 compatibility)
// app.use('*', (req, res) => {
//   console.log(`📥 ${req.method} ${req.path} - Route not found`);
//   res.status(404).json({
//     error: 'Route not found',
//     method: req.method,
//     path: req.path,
//     suggestion: 'Check the API documentation for available endpoints'
//   });
// });

// Store stream processor instance for graceful shutdown
let streamProcessor = null;

// Initialize server
async function startServer() {
  console.log('🚀 Starting LocalStack Development Server...');

  // Load handlers first
  const handlersLoaded = await loadHandlers();

  if (!handlersLoaded) {
    console.error('❌ Failed to load handlers, starting server with limited functionality');
  }

  // Start DynamoDB Stream processor in LocalStack mode
  if (process.env.USE_LOCALSTACK === 'true') {
    try {
      console.log('🔄 Starting DynamoDB Stream processor for LocalStack...');
      const { StreamProcessor } = await import('./dist/local-dev/stream-processor.js');

      streamProcessor = new StreamProcessor({
        tableName: process.env.TABLE_NAME || 'tamafriends-local',
        endpoint: process.env.LOCALSTACK_ENDPOINT || 'http://localhost:4566',
        region: process.env.AWS_REGION || 'us-east-1',
        pollInterval: 2000  // Poll every 2 seconds
      });

      // Load and register stream handlers
      const { handler: followCounterHandler } = await import('./dist/handlers/streams/follow-counter.js');
      const { handler: likeCounterHandler } = await import('./dist/handlers/streams/like-counter.js');
      const { handler: commentCounterHandler } = await import('./dist/handlers/streams/comment-counter.js');
      const { handler: feedFanoutHandler } = await import('./dist/handlers/streams/feed-fanout.js');
      const { handler: feedCleanupPostDeleteHandler } = await import('./dist/handlers/streams/feed-cleanup-post-delete.js');
      const { handler: feedCleanupUnfollowHandler } = await import('./dist/handlers/streams/feed-cleanup-unfollow.js');

      streamProcessor.registerHandler(followCounterHandler);
      streamProcessor.registerHandler(likeCounterHandler);
      streamProcessor.registerHandler(commentCounterHandler);
      streamProcessor.registerHandler(feedFanoutHandler);
      streamProcessor.registerHandler(feedCleanupPostDeleteHandler);
      streamProcessor.registerHandler(feedCleanupUnfollowHandler);

      await streamProcessor.start();
      console.log('✅ Stream processor started - profile stats will update automatically');
    } catch (error) {
      console.error('❌ Failed to start stream processor:', error);
      console.error('   Profile stats (followers/following/likes) will not update automatically');
    }
  }

  app.listen(port, () => {
    console.log(`🚀 LocalStack Development Server running on http://localhost:${port}`);
    console.log(`📊 Mode: LocalStack Development`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 DynamoDB: ${process.env.USE_LOCALSTACK === 'true' ? 'LocalStack' : 'AWS'}`);
    console.log(`📦 S3: ${process.env.USE_LOCALSTACK === 'true' ? 'LocalStack' : 'AWS'}`);
    console.log(`🔑 Table: ${process.env.TABLE_NAME || 'undefined'}`);
    console.log(`📦 Handlers: ${Object.keys(handlers).length} loaded`);
    console.log(`🔄 Stream Processor: ${streamProcessor ? 'Running' : 'Disabled'}`);
    console.log(`\n🌐 Available REST endpoints (Auth + Utilities only):`);
    console.log(`\n  📝 Authentication:`);
    console.log(`    POST /auth/login`);
    console.log(`    POST /auth/register`);
    console.log(`    GET  /auth/profile`);
    console.log(`    PUT  /auth/profile`);
    console.log(`    POST /auth/logout`);
    console.log(`    POST /auth/refresh`);
    console.log(`\n  🔧 Utilities:`);
    console.log(`    GET  /hello`);
    console.log(`    GET  /health`);
    if (process.env.NODE_ENV === 'development' || process.env.USE_LOCALSTACK === 'true') {
      console.log(`\n  🛠️  Development Tools:`);
      console.log(`    GET  /dev/cache-status`);
      console.log(`    GET  /dev/kinesis-records`);
    }
    console.log(`\n  ℹ️  All business operations (posts, feeds, likes, etc.) use GraphQL`);
    console.log(`     GraphQL endpoint: http://localhost:4000/graphql`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 SIGTERM received, shutting down gracefully...');
  if (streamProcessor) {
    await streamProcessor.stop();
    console.log('✅ Stream processor stopped');
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📴 SIGINT received, shutting down gracefully...');
  if (streamProcessor) {
    await streamProcessor.stop();
    console.log('✅ Stream processor stopped');
  }
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
