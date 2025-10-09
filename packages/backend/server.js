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
      { name: 'authLogin', path: './dist/handlers/auth/login.js' },
      { name: 'authRegister', path: './dist/handlers/auth/register.js' },
      { name: 'authProfile', path: './dist/handlers/auth/profile.js' },
      { name: 'authLogout', path: './dist/handlers/auth/logout.js' },
      { name: 'authRefresh', path: './dist/handlers/auth/refresh.js' },
      { name: 'profileGetProfile', path: './dist/handlers/profile/get-profile.js' },
      { name: 'profileGetCurrentProfile', path: './dist/handlers/profile/get-current-profile.js' },
      { name: 'profileUpdateProfile', path: './dist/handlers/profile/update-profile.js' },
      { name: 'profileGetUploadUrl', path: './dist/handlers/profile/get-upload-url.js' },
      { name: 'postsCreatePost', path: './dist/handlers/posts/create-post.js' },
      { name: 'postsUpdatePost', path: './dist/handlers/posts/update-post.js' },
      { name: 'postsGetUserPosts', path: './dist/handlers/posts/get-user-posts.js' },
      { name: 'postsDeletePost', path: './dist/handlers/posts/delete-post.js' },
      { name: 'postsGetPost', path: './dist/handlers/posts/get-post.js' },
      { name: 'feedGetFeed', path: './dist/handlers/feed/get-feed.js' },
      { name: 'feedGetFollowingFeed', path: './dist/handlers/feed/get-following-feed.js' },
      { name: 'likesLikePost', path: './dist/handlers/likes/like-post.js' },
      { name: 'likesUnlikePost', path: './dist/handlers/likes/unlike-post.js' },
      { name: 'likesGetLikeStatus', path: './dist/handlers/likes/get-like-status.js' },
      { name: 'followsFollowUser', path: './dist/handlers/follows/follow-user.js' },
      { name: 'followsUnfollowUser', path: './dist/handlers/follows/unfollow-user.js' },
      { name: 'followsGetFollowStatus', path: './dist/handlers/follows/get-follow-status.js' },
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
 * Convert Express request/response to AWS Lambda format and back
 */
const createLambdaEvent = (req) => {
  return {
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

// Auth routes
app.post('/auth/login', (req, res) => callHandler('authLogin', req, res));
app.post('/auth/register', (req, res) => callHandler('authRegister', req, res));
app.get('/auth/profile', (req, res) => callHandler('authProfile', req, res));
app.put('/auth/profile', (req, res) => callHandler('authProfile', req, res));
app.post('/auth/logout', (req, res) => callHandler('authLogout', req, res));
app.post('/auth/refresh', (req, res) => callHandler('authRefresh', req, res));

// Profile routes
app.get('/profile/me', (req, res) => callHandler('profileGetCurrentProfile', req, res));
app.get('/profile/:handle', (req, res) => callHandler('profileGetProfile', req, res));
app.put('/profile', (req, res) => callHandler('profileUpdateProfile', req, res));
app.post('/profile/upload-url', (req, res) => callHandler('profileGetUploadUrl', req, res));

// Posts routes
app.post('/posts', (req, res) => callHandler('postsCreatePost', req, res));
app.put('/posts/:postId', (req, res) => callHandler('postsUpdatePost', req, res));
app.get('/profile/:handle/posts', (req, res) => callHandler('postsGetUserPosts', req, res));
app.delete('/posts/:postId', (req, res) => callHandler('postsDeletePost', req, res));
app.get('/post/:postId', (req, res) => callHandler('postsGetPost', req, res));

// Feed routes
app.get('/feed', (req, res) => callHandler('feedGetFeed', req, res));
app.get('/feed/following', (req, res) => callHandler('feedGetFollowingFeed', req, res));

// Like routes
app.post('/likes', (req, res) => callHandler('likesLikePost', req, res));
app.delete('/likes', (req, res) => callHandler('likesUnlikePost', req, res));
app.get('/likes/:postId', (req, res) => callHandler('likesGetLikeStatus', req, res));

// Follow routes
app.post('/follows', (req, res) => callHandler('followsFollowUser', req, res));
app.delete('/follows', (req, res) => callHandler('followsUnfollowUser', req, res));
app.get('/follows/:userId/status', (req, res) => callHandler('followsGetFollowStatus', req, res));

// Hello endpoint
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

// Initialize server
async function startServer() {
  console.log('🚀 Starting LocalStack Development Server...');

  // Load handlers first
  const handlersLoaded = await loadHandlers();

  if (!handlersLoaded) {
    console.error('❌ Failed to load handlers, starting server with limited functionality');
  }

  app.listen(port, () => {
    console.log(`🚀 LocalStack Development Server running on http://localhost:${port}`);
    console.log(`📊 Mode: LocalStack Development`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 DynamoDB: ${process.env.USE_LOCALSTACK === 'true' ? 'LocalStack' : 'AWS'}`);
    console.log(`📦 S3: ${process.env.USE_LOCALSTACK === 'true' ? 'LocalStack' : 'AWS'}`);
    console.log(`🔑 Table: ${process.env.TABLE_NAME || 'undefined'}`);
    console.log(`📦 Handlers: ${Object.keys(handlers).length} loaded`);
    console.log(`\n🌐 Available endpoints:`);
    console.log(`  POST /auth/login`);
    console.log(`  POST /auth/register`);
    console.log(`  GET  /auth/profile`);
    console.log(`  PUT  /auth/profile`);
    console.log(`  POST /auth/logout`);
    console.log(`  POST /auth/refresh`);
    console.log(`  GET  /profile/me`);
    console.log(`  GET  /profile/:handle`);
    console.log(`  PUT  /profile`);
    console.log(`  POST /profile/upload-url`);
    console.log(`  POST /posts`);
    console.log(`  PUT  /posts/:postId`);
    console.log(`  GET  /posts/:handle`);
    console.log(`  DELETE /posts/:postId`);
    console.log(`  GET  /post/:postId`);
    console.log(`  POST /likes`);
    console.log(`  DELETE /likes`);
    console.log(`  GET  /likes/:postId`);
    console.log(`  POST /follows`);
    console.log(`  DELETE /follows`);
    console.log(`  GET  /follows/:userId/status`);
    console.log(`  GET  /hello`);
    console.log(`  GET  /health`);
  });
}

// Start the server
startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});