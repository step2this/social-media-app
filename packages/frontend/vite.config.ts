import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['lodash-es', 'zustand']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src',
      '@social-media-app/shared': path.resolve(__dirname, '../shared/dist/index.js')
    }
  },
  optimizeDeps: {
    // Exclude workspace packages from pre-bundling to enable proper HMR in monorepo
    exclude: ['@social-media-app/shared']
  }
});