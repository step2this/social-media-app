import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/errors/index.ts',
    'src/test-utils/index.ts',
    'src/test-utils/fixtures/index.ts',
  ],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  outDir: 'dist',
  external: ['zod', '@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner'],
});
