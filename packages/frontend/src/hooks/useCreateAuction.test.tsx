/**
 * useCreateAuction Hook Tests - Relay Version
 *
 * Tests the useCreateAuction hook using Relay MockEnvironment.
 * Minimal required tests following TDD principles.
 *
 * Pattern: MockEnvironment → RelayEnvironmentProvider → useCreateAuction hook
 * Best Practices: DRY helpers, focused tests on behavior
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { RelayEnvironmentProvider } from 'react-relay';
import { createMockEnvironment, MockPayloadGenerator } from 'relay-test-utils';
import type { ReactNode } from 'react';
import { useCreateAuction } from './useCreateAuction';
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

describe('useCreateAuction (Relay)', () => {
  let environment: ReturnType<typeof createMockEnvironment>;

  beforeEach(() => {
    environment = createMockEnvironment();
  });

  describe('mutation execution', () => {
    it('should call mutation with correct variables', () => {
      const { result } = renderHook(() => useCreateAuction(), {
        wrapper: createWrapper(environment)
      });

      // Execute mutation
      act(() => {
        result.current.createAuction({
          title: 'Test Auction',
          description: 'Test Description',
          startPrice: 100,
          reservePrice: 200,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 86400000).toISOString(),
          fileType: 'image/jpeg'
        });
      });

      // Verify mutation was called
      const operation = environment.mock.getMostRecentOperation();
      expect(operation.request.node.operation.name).toBe('useCreateAuctionMutation');
      expect(operation.request.variables.input).toMatchObject({
        title: 'Test Auction',
        description: 'Test Description',
        startPrice: 100,
        reservePrice: 200,
        fileType: 'image/jpeg'
      });
    });
  });

  describe('mutation state', () => {
    it('should track in-flight state during mutation', async () => {
      const { result } = renderHook(() => useCreateAuction(), {
        wrapper: createWrapper(environment)
      });

      // Initially not in flight
      expect(result.current.isInFlight).toBe(false);

      // Start mutation
      act(() => {
        result.current.createAuction({
          title: 'Test Auction',
          description: 'Test Description',
          startPrice: 100,
          reservePrice: 200,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 86400000).toISOString(),
          fileType: 'image/jpeg'
        });
      });

      // Should be in flight
      expect(result.current.isInFlight).toBe(true);

      // Resolve mutation
      act(() => {
        environment.mock.resolveMostRecentOperation(operation =>
          MockPayloadGenerator.generate(operation, {
            CreateAuctionPayload: () => ({
              auction: {
                id: 'auction-123',
                userId: 'user-1',
                title: 'Test Auction',
                description: 'Test Description',
                imageUrl: 'https://example.com/image.jpg',
                startPrice: 100,
                reservePrice: 200,
                currentPrice: 100,
                status: 'PENDING',
                startTime: new Date().toISOString(),
                endTime: new Date(Date.now() + 86400000).toISOString(),
                bidCount: 0,
                createdAt: new Date().toISOString()
              },
              uploadUrl: 'https://s3.amazonaws.com/upload'
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
      const { result } = renderHook(() => useCreateAuction(), {
        wrapper: createWrapper(environment)
      });

      // Start mutation
      act(() => {
        result.current.createAuction({
          title: 'Test Auction',
          description: 'Test Description',
          startPrice: 100,
          reservePrice: 200,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 86400000).toISOString(),
          fileType: 'image/jpeg'
        });
      });

      // Reject mutation
      act(() => {
        environment.mock.rejectMostRecentOperation(
          new Error('Failed to create auction')
        );
      });

      // Should have error
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.error?.message).toBe('Failed to create auction');
      });
    });

    it('should clear error on subsequent mutation call', async () => {
      const { result } = renderHook(() => useCreateAuction(), {
        wrapper: createWrapper(environment)
      });

      // First mutation fails
      act(() => {
        result.current.createAuction({
          title: 'Test Auction 1',
          description: 'Test Description 1',
          startPrice: 100,
          reservePrice: 200,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 86400000).toISOString(),
          fileType: 'image/jpeg'
        });
      });

      act(() => {
        environment.mock.rejectMostRecentOperation(
          new Error('Failed to create auction')
        );
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Calling createAuction again should clear the error
      act(() => {
        result.current.createAuction({
          title: 'Test Auction 2',
          description: 'Test Description 2',
          startPrice: 150,
          reservePrice: 250,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 86400000).toISOString(),
          fileType: 'image/png'
        });
      });

      // Error should be cleared immediately when createAuction is called
      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });
});
