import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  outDir: 'dist',
  external: [
    '@social-media-app/shared',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/client-kinesis',
    '@aws-sdk/client-s3',
    '@aws-sdk/lib-dynamodb',
    '@aws-sdk/s3-request-presigner',
    'ioredis',
    'lodash-es',
    'zod',
  ],
});
