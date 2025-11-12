/**
 * LikeServiceAdapter Tests
 *
 * Tests service-to-repository adaptation.
 * Only mocks at service boundary - tests behavior, not implementation.
 */

import { describe, it, expect } from 'vitest';
import { LikeServiceAdapter } from '../LikeServiceAdapter.js';

describe('LikeServiceAdapter', () => {
  it('transforms service response to repository format', async () => {
    // Mock DAL format with likesCount (not likeCount)
    const mockStatus = { isLiked: true, likesCount: 42 };
    const mockService = {
      getPostLikeStatus: async () => mockStatus,
    };
    const adapter = new LikeServiceAdapter(mockService as any);

    const result = await adapter.getPostLikeStatus('user-1', 'post-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isLiked).toBe(true);
      // Adapter transforms likesCount → likeCount
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
