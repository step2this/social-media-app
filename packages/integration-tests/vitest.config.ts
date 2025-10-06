/**
 * Vitest configuration for integration tests
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment configuration
    environment: 'node',

    // Test file patterns
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],

    // Test execution configuration
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 60000, // 60 seconds for setup/teardown hooks

    // Parallel execution
    pool: 'threads',

    // Reporter configuration
    reporter: ['verbose', 'json'],
    outputFile: {
      json: './test-results.json'
    },

    // Coverage configuration (optional)
    coverage: {
      enabled: false, // Disable for integration tests
      provider: 'v8'
    },

    // Test environment variables
    env: {
      NODE_ENV: 'test',
      USE_LOCALSTACK: 'true',
      API_BASE_URL: 'http://localhost:3001',
      LOCALSTACK_ENDPOINT: 'http://localhost:4566',
      TABLE_NAME: 'tamafriends-local',
      MEDIA_BUCKET_NAME: 'tamafriends-media-local',
      AWS_REGION: 'us-east-1',
      AWS_ACCESS_KEY_ID: 'test',
      AWS_SECRET_ACCESS_KEY: 'test'
    },

    // Setup files
    setupFiles: []
  },

  // ESM configuration
  esbuild: {
    target: 'node18'
  }
});