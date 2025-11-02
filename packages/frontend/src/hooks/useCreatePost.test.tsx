/**
 * useCreatePost Hook Tests - Relay Version
 *
 * Tests the useCreatePost hook using Relay MockEnvironment.
 * Minimal required tests following TDD principles.
 *
 * Pattern: MockEnvironment → RelayEnvironmentProvider → useCreatePost hook
 * Best Practices: DRY helpers, focused tests on behavior
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { RelayEnvironmentProvider } from 'react-relay';
import { createMockEnvironment, MockPayloadGenerator } from 'relay-test-utils';
import type { ReactNode } from 'react';
import { useCreatePost } from './useCreatePost';
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

describe('useCreatePost (Relay)', () => {
  let environment: ReturnType<typeof createMockEnvironment>;

  beforeEach(() => {
    environment = createMockEnvironment();
  });

  describe('mutation execution', () => {
    it('should call mutation with correct variables', () => {
      const { result } = renderHook(() => useCreatePost(), {
        wrapper: createWrapper(environment)
      });

      // Execute mutation
      act(() => {
        result.current.createPost({
          fileType: 'image/jpeg',
          caption: 'Test caption'
        });
      });

      // Verify mutation was called
      const operation = environment.mock.getMostRecentOperation();
      expect(operation.request.node.operation.name).toBe('useCreatePostMutation');
      expect(operation.request.variables.input).toEqual({
        fileType: 'image/jpeg',
        caption: 'Test caption'
      });
    });
  });

  describe('mutation state', () => {
    it('should track in-flight state during mutation', async () => {
      const { result } = renderHook(() => useCreatePost(), {
        wrapper: createWrapper(environment)
      });

      // Initially not in flight
      expect(result.current.isInFlight).toBe(false);

      // Start mutation
      act(() => {
        result.current.createPost({
          fileType: 'image/jpeg',
          caption: 'Test'
        });
      });

      // Should be in flight
      expect(result.current.isInFlight).toBe(true);

      // Resolve mutation
      act(() => {
        environment.mock.resolveMostRecentOperation(operation =>
          MockPayloadGenerator.generate(operation, {
            CreatePostPayload: () => ({
              post: {
                id: 'post-123',
                imageUrl: 'https://example.com/image.jpg',
                caption: 'Test',
                createdAt: new Date().toISOString(),
                author: {
                  id: 'user-1',
                  handle: 'testuser',
                  username: 'Test User'
                }
              },
              uploadUrl: 'https://s3.amazonaws.com/upload',
              thumbnailUploadUrl: 'https://s3.amazonaws.com/thumb'
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
      const { result } = renderHook(() => useCreatePost(), {
        wrapper: createWrapper(environment)
      });

      // Start mutation
      act(() => {
        result.current.createPost({
          fileType: 'image/jpeg',
          caption: 'Test'
        });
      });

      // Reject mutation
      act(() => {
        environment.mock.rejectMostRecentOperation(
          new Error('Failed to create post')
        );
      });

      // Should have error
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.error?.message).toBe('Failed to create post');
      });
    });

    it('should clear error on subsequent successful mutation', async () => {
      const { result } = renderHook(() => useCreatePost(), {
        wrapper: createWrapper(environment)
      });

      // First mutation fails
      act(() => {
        result.current.createPost({
          fileType: 'image/jpeg',
          caption: 'Test 1'
        });
      });

      act(() => {
        environment.mock.rejectMostRecentOperation(
          new Error('Failed to create post')
        );
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Second mutation succeeds
      act(() => {
        result.current.createPost({
          fileType: 'image/jpeg',
          caption: 'Test 2'
        });
      });

      act(() => {
        environment.mock.resolveMostRecentOperation(operation =>
          MockPayloadGenerator.generate(operation, {
            CreatePostPayload: () => ({
              post: {
                id: 'post-456',
                imageUrl: 'https://example.com/image2.jpg',
                caption: 'Test 2',
                createdAt: new Date().toISOString(),
                author: {
                  id: 'user-1',
                  handle: 'testuser',
                  username: 'Test User'
                }
              },
              uploadUrl: 'https://s3.amazonaws.com/upload2',
              thumbnailUploadUrl: 'https://s3.amazonaws.com/thumb2'
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
