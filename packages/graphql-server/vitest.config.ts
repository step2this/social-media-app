import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        '__tests__/',
        'src/**/*.test.ts',
        'src/**/__tests__/**',
        'src/schema/generated/',
        'src/types/**',
        '*.config.ts',
      ],
    },
  },
  // Use server.deps.optimizer instead of deprecated deps.inline
  server: {
    deps: {
      inline: [
        '@opentelemetry/sdk-trace-node',
        '@opentelemetry/sdk-trace-base',
        '@opentelemetry/resources',
      ],
    },
  },
});
