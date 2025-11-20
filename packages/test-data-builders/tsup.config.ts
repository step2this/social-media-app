import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/scenarios/index.ts'],
  format: ['esm'],
  dts: false, // Disable DTS generation for now - types will be checked by TS compiler
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'node22',
  outDir: 'dist',
  skipNodeModulesBundle: true,
});
