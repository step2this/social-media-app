/**
 * useAuctions Hook Tests - Relay Version
 *
 * Tests the useAuctions hook using Relay MockEnvironment.
 * Focuses on query behavior and variables - Relay handles loading/errors via Suspense/ErrorBoundary.
 *
 * Pattern: MockEnvironment → RelayEnvironmentProvider → useAuctions hook
 * Minimal required tests following TDD principles.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { RelayEnvironmentProvider } from 'react-relay';
import { createMockEnvironment, MockPayloadGenerator } from 'relay-test-utils';
import type { ReactNode } from 'react';
import { useAuctions } from './useAuctions';
import type { Environment } from 'relay-runtime';

/**
 * Test Helper: Create mock auctions array
 */
const createMockAuctions = (count: number, overrides = {}) =>
  Array.from({ length: count }, (_, i) => ({
    id: `auction-${i + 1}`,
    userId: 'user-1',
    title: `Auction ${i + 1}`,
    description: `Description for auction ${i + 1}`,
    imageUrl: `https://example.com/auction-${i + 1}.jpg`,
    startPrice: 100,
    reservePrice: 200,
    currentPrice: 150,
    status: 'ACTIVE',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 86400000).toISOString(),
    bidCount: 0,
    createdAt: new Date().toISOString(),
    ...overrides
  }));

/**
 * Test wrapper that provides Relay environment
 */
function createWrapper(environment: Environment) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <RelayEnvironmentProvider environment={environment}>
        {children}
      </RelayEnvironmentProvider>
    );
  };
}

describe('useAuctions (Relay)', () => {
  let environment: ReturnType<typeof createMockEnvironment>;

  beforeEach(() => {
    environment = createMockEnvironment();
  });

  describe('query execution', () => {
    it('should initiate query on mount', () => {
      renderHook(() => useAuctions(), {
        wrapper: createWrapper(environment)
      });

      // Verify that a query operation was initiated
      const operation = environment.mock.getMostRecentOperation();
      expect(operation).toBeDefined();
      expect(operation.request.node.operation.name).toBe('useAuctionsQuery');
    });
  });

  describe('filtering', () => {
    it('should include status filter in query variables', () => {
      renderHook(
        () => useAuctions({ status: 'ACTIVE' }),
        {
          wrapper: createWrapper(environment)
        }
      );

      // Check that the query was called with correct variables
      const operation = environment.mock.getMostRecentOperation();
      expect(operation.request.variables.status).toBe('ACTIVE');
    });

    it('should include userId filter in query variables', () => {
      renderHook(
        () => useAuctions({ userId: 'user-123' }),
        {
          wrapper: createWrapper(environment)
        }
      );

      // Check that the query was called with correct variables
      const operation = environment.mock.getMostRecentOperation();
      expect(operation.request.variables.userId).toBe('user-123');
    });
  });

  describe('pagination', () => {
    it('should query with default limit', () => {
      renderHook(() => useAuctions(), {
        wrapper: createWrapper(environment)
      });

      // Check that the query includes limit
      const operation = environment.mock.getMostRecentOperation();
      expect(operation.request.variables.limit).toBe(20);
    });

    it('should pass cursor variable when provided', () => {
      renderHook(() => useAuctions(), {
        wrapper: createWrapper(environment)
      });

      // Check that the query includes cursor parameter (null by default)
      const operation = environment.mock.getMostRecentOperation();
      expect(operation.request.variables).toHaveProperty('cursor');
      expect(operation.request.variables.cursor).toBeNull();
    });
  });
});
