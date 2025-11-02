/**
 * usePlaceBid Hook Tests - Relay Version
 *
 * Tests the usePlaceBid hook using Relay MockEnvironment.
 * Minimal required tests following TDD principles.
 *
 * Pattern: MockEnvironment → RelayEnvironmentProvider → usePlaceBid hook
 * Best Practices: DRY helpers, focused tests on behavior
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { RelayEnvironmentProvider } from 'react-relay';
import { createMockEnvironment, MockPayloadGenerator } from 'relay-test-utils';
import type { ReactNode } from 'react';
import { usePlaceBid } from './usePlaceBid';
import type { Environment } from 'relay-runtime';

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

describe('usePlaceBid (Relay)', () => {
  let environment: ReturnType<typeof createMockEnvironment>;

  beforeEach(() => {
    environment = createMockEnvironment();
  });

  describe('mutation execution', () => {
    it('should call mutation with correct variables', () => {
      const { result } = renderHook(() => usePlaceBid(), {
        wrapper: createWrapper(environment)
      });

      // Execute mutation
      act(() => {
        result.current.placeBid({
          auctionId: 'auction-123',
          amount: 150.50
        });
      });

      // Verify mutation was called
      const operation = environment.mock.getMostRecentOperation();
      expect(operation.request.node.operation.name).toBe('usePlaceBidMutation');
      expect(operation.request.variables.input).toEqual({
        auctionId: 'auction-123',
        amount: 150.50
      });
    });
  });

  describe('mutation state', () => {
    it('should track in-flight state during mutation', async () => {
      const { result } = renderHook(() => usePlaceBid(), {
        wrapper: createWrapper(environment)
      });

      // Initially not in flight
      expect(result.current.isInFlight).toBe(false);

      // Start mutation
      act(() => {
        result.current.placeBid({
          auctionId: 'auction-123',
          amount: 200
        });
      });

      // Should be in flight
      expect(result.current.isInFlight).toBe(true);

      // Resolve mutation
      act(() => {
        environment.mock.resolveMostRecentOperation(operation =>
          MockPayloadGenerator.generate(operation, {
            PlaceBidPayload: () => ({
              bid: {
                id: 'bid-456',
                auctionId: 'auction-123',
                userId: 'user-1',
                amount: 200,
                createdAt: new Date().toISOString()
              },
              auction: {
                id: 'auction-123',
                currentPrice: 200,
                bidCount: 5
              }
            })
          })
        );
      });

      // Should no longer be in flight
      await waitFor(() => {
        expect(result.current.isInFlight).toBe(false);
      });
    });
  });

  describe('error handling', () => {
    it('should handle mutation errors gracefully', async () => {
      const { result } = renderHook(() => usePlaceBid(), {
        wrapper: createWrapper(environment)
      });

      // Start mutation
      act(() => {
        result.current.placeBid({
          auctionId: 'auction-123',
          amount: 100
        });
      });

      // Reject mutation
      act(() => {
        environment.mock.rejectMostRecentOperation(
          new Error('Bid amount too low')
        );
      });

      // Should have error
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.error?.message).toBe('Bid amount too low');
      });
    });

    it('should clear error on subsequent successful mutation', async () => {
      const { result } = renderHook(() => usePlaceBid(), {
        wrapper: createWrapper(environment)
      });

      // First mutation fails
      act(() => {
        result.current.placeBid({
          auctionId: 'auction-123',
          amount: 50
        });
      });

      act(() => {
        environment.mock.rejectMostRecentOperation(
          new Error('Bid amount too low')
        );
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Second mutation succeeds
      act(() => {
        result.current.placeBid({
          auctionId: 'auction-123',
          amount: 200
        });
      });

      act(() => {
        environment.mock.resolveMostRecentOperation(operation =>
          MockPayloadGenerator.generate(operation, {
            PlaceBidPayload: () => ({
              bid: {
                id: 'bid-789',
                auctionId: 'auction-123',
                userId: 'user-1',
                amount: 200,
                createdAt: new Date().toISOString()
              },
              auction: {
                id: 'auction-123',
                currentPrice: 200,
                bidCount: 6
              }
            })
          })
        );
      });

      // Error should be cleared
      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });
});
