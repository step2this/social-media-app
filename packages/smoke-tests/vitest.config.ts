import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 30000, // 30 seconds for API calls
    hookTimeout: 10000  // 10 seconds for setup/teardown
  }
});