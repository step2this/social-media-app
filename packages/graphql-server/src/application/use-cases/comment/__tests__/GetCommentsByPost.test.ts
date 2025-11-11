/**
 * GetCommentsByPost Use Case Tests
 *
 * Behavior-focused tests using fake repository.
 * Tests verify behavior (outputs), not implementation details.
 */

import { describe, it, expect } from 'vitest';
import { GetCommentsByPost } from '../GetCommentsByPost.js';
import { FakeCommentRepository } from '../../../../../__tests__/helpers/fake-repositories.js';
import { createMockComments } from '@social-media-app/shared/test-utils/fixtures';

describe('GetCommentsByPost', () => {
  it('returns comments for the specified post', async () => {
    const comments = createMockComments(5, { postId: 'post-1' });
    const repository = new FakeCommentRepository(comments);
    const useCase = new GetCommentsByPost(repository);

    const result = await useCase.execute('post-1', 20);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(5);
      expect(result.data.items[0].postId).toBe('post-1');
    }
  });

  it('returns empty array when no comments exist', async () => {
    const repository = new FakeCommentRepository([]);
    const useCase = new GetCommentsByPost(repository);

    const result = await useCase.execute('post-1', 20);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(0);
      expect(result.data.hasMore).toBe(false);
    }
  });

  it('indicates when more comments are available', async () => {
    const comments = createMockComments(25, { postId: 'post-1' });
    const repository = new FakeCommentRepository(comments);
    const useCase = new GetCommentsByPost(repository);

    const result = await useCase.execute('post-1', 20);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(20);
      expect(result.data.hasMore).toBe(true);
    }
  });
});
