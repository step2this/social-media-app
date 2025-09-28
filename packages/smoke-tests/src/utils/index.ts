/**
 * Utility functions for smoke tests
 */

// Test isolation utilities
export { generateTestId } from './test-id.js';

// Environment detection utilities
export { detectEnvironment, type TestEnvironment } from './environment.js';

/**
 * Simple utility to demonstrate package structure
 */
export function greet(name: string): string {
  return `Hello, ${name}!`;
}