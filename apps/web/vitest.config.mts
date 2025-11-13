import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test-setup.ts'],
    globals: false, // Use explicit imports for vi, describe, etc.
    css: false, // Skip CSS processing for faster tests
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
