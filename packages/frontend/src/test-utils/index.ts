/**
 * Test utilities barrel export
 * Provides centralized access to all testing helpers
 */

// Mock factories for domain objects
export * from './mock-factories.js';

// Hook mocks for testing components that use hooks
export * from './hook-mocks.js';

// File mock utilities for upload/validation testing
export * from './file-mocks.js';

// Render helpers for component testing
export * from './render-helpers.js';

// Test constants (centralized UI text for maintainability)
export * from '../pages/__tests__/test-constants.js';

// Relay transformers (type-safe data transformations)
export * from '../relay/relay-transformers.js';

// Relay feed fixture adapters (mock data for Relay tests)
export * from './relay-feed-adapters.js';
