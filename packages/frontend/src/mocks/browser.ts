import { setupWorker } from 'msw/browser';
import { handlers } from './handlers.js';

/**
 * Mock Service Worker setup for browser environment
 * This enables API mocking in development mode
 */
export const worker = setupWorker(...handlers);

/**
 * Start MSW in development mode
 */
export const startMocking = async () => {
  if (import.meta.env.DEV) {
    try {
      await worker.start({
        onUnhandledRequest: 'warn',
        serviceWorker: {
          url: '/mockServiceWorker.js'
        }
      });
      console.info('🚀 Mock API server started');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      console.info(`📡 API calls to ${API_BASE_URL} will be mocked`);
    } catch (error) {
      console.error('Failed to start MSW:', error);
    }
  }
};

/**
 * Stop MSW
 */
export const stopMocking = () => {
  worker.stop();
  console.info('🛑 Mock API server stopped');
};