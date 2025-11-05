/**
 * LikeServiceAdapter Tests
 *
 * Tests service-to-repository adaptation.
 * Only mocks at service boundary - tests behavior, not implementation.
 */

import { describe, it, expect } from 'vitest';
import { LikeServiceAdapter } from '../LikeServiceAdapter';
import { createMockLiked } from '@social-media-app/shared/test-utils/fixtures';

describe('LikeServiceAdapter', () => {
  it('transforms service response to repository format', async () => {
    const mockStatus = createMockLiked(42);
    const mockService = {
      getPostLikeStatus: async () => mockStatus,
    };
    const adapter = new LikeServiceAdapter(mockService as any);

    const result = await adapter.getPostLikeStatus('user-1', 'post-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isLiked).toBe(true);
      expect(result.data.likeCount).toBe(42);
    }
  });

  it('handles service errors gracefully', async () => {
    const mockService = {
      getPostLikeStatus: async () => {
        throw new Error('Service down');
      },
    };
    const adapter = new LikeServiceAdapter(mockService as any);

    const result = await adapter.getPostLikeStatus('user-1', 'post-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Service down');
    }
  });
});
