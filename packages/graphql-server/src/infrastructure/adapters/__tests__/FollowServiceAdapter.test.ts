/**
 * FollowServiceAdapter Tests
 *
 * Tests service-to-repository adaptation.
 * Only mocks at service boundary - tests behavior, not implementation.
 */

import { describe, it, expect } from 'vitest';
import { FollowServiceAdapter } from '../FollowServiceAdapter';
import { createMockFollowing, createMockNotFollowing } from '@social-media-app/shared/test-utils/fixtures';

describe('FollowServiceAdapter', () => {
  it('transforms service response to repository format', async () => {
    const mockStatus = createMockFollowing();
    const mockService = {
      getFollowStatus: async () => mockStatus,
    };
    const adapter = new FollowServiceAdapter(mockService as any);

    const result = await adapter.getFollowStatus('user-1', 'user-2');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.isFollowing).toBe(true);
    }
  });

  it('handles service errors gracefully', async () => {
    const mockService = {
      getFollowStatus: async () => {
        throw new Error('Service down');
      },
    };
    const adapter = new FollowServiceAdapter(mockService as any);

    const result = await adapter.getFollowStatus('user-1', 'user-2');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Service down');
    }
  });
});
