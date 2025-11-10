import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/standalone-server.ts', 'src/server.ts', 'src/lambda.ts'],
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: false, // Disable DTS generation - conflicts with incremental tsconfig option
  splitting: false,
  treeshake: true,
  external: [
    // Mark all @social-media-app/* packages as external (workspace dependencies)
    /@social-media-app\/.*/,
    // AWS SDK and other large dependencies
    /@aws-sdk\/.*/,
    'graphql',
    '@apollo/server',
  ],
  noExternal: [],
  // Keep Node.js built-ins external
  platform: 'node',
  // Preserve dynamic imports and __dirname/__filename
  shims: true,
});
