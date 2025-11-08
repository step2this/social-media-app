/**
 * Vitest setup file
 *
 * Sets up test environment variables before tests run.
 * This ensures services can be instantiated at module load time.
 */

// Set up test environment for AWS services
process.env.NODE_ENV = 'test';
process.env.USE_LOCALSTACK = 'true';
process.env.TABLE_NAME = 'tamafriends-test';

// Mock AWS credentials for LocalStack
process.env.AWS_ACCESS_KEY_ID = 'test';
process.env.AWS_SECRET_ACCESS_KEY = 'test';
process.env.AWS_REGION = 'us-east-1';

// Set up test environment for JWT
process.env.JWT_SECRET = 'test-secret-key-for-testing-only-do-not-use-in-production-must-be-at-least-32-characters';
process.env.JWT_ACCESS_TOKEN_EXPIRY = '900';  // 15 minutes
process.env.JWT_REFRESH_TOKEN_EXPIRY = '2592000';  // 30 days
