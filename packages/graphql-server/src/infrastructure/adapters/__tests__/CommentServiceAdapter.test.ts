/**
 * CommentServiceAdapter Tests
 *
 * Tests service-to-repository adaptation.
 * Only mocks at service boundary - tests behavior, not implementation.
 */

import { describe, it, expect } from 'vitest';
import { CommentServiceAdapter } from '../CommentServiceAdapter.js';
import { createMockComments } from '@social-media-app/shared/test-utils/fixtures';

describe('CommentServiceAdapter', () => {
  it('transforms service response to repository format', async () => {
    const mockComments = createMockComments(3);
    const mockService = {
      getCommentsByPost: async () => ({
        comments: mockComments,
        hasMore: false,
        nextCursor: null,
      }),
    };
    const adapter = new CommentServiceAdapter(mockService as any);

    const result = await adapter.getCommentsByPost('post-1', 20);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toEqual(mockComments);
      expect(result.data.hasMore).toBe(false);
    }
  });

  it('handles service errors gracefully', async () => {
    const mockService = {
      getCommentsByPost: async () => {
        throw new Error('Service down');
      },
    };
    const adapter = new CommentServiceAdapter(mockService as any);

    const result = await adapter.getCommentsByPost('post-1', 20);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Service down');
    }
  });
});
