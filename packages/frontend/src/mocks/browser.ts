import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

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
      console.info('📡 API calls to http://localhost:3001 will be mocked');
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