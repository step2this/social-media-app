/**
 * Like Service Tests
 *
 * Comprehensive tests for GraphQL-based Like service.
 * Uses dependency injection and factory pattern for DRY testing.
 * Tests behavior, not implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { ILikeService } from '../interfaces/ILikeService';
import { LikeServiceGraphQL } from '../implementations/LikeService.graphql';
import { MockGraphQLClient } from '../../graphql/client.mock';
import {
  createMockLikeResponse,
  createMockUnlikeResponse,
  createMockLikedStatus,
  createMockUnlikedStatus,
} from './fixtures/likeFixtures';
import {
  wrapInGraphQLSuccess,
  wrapInGraphQLError,
} from './fixtures/graphqlFixtures';

describe('LikeService.graphql', () => {
  let service: ILikeService;
  let mockClient: MockGraphQLClient;

  beforeEach(() => {
    mockClient = new MockGraphQLClient();
    service = new LikeServiceGraphQL(mockClient);
  });

  describe('likePost', () => {
    it('should like a post successfully', async () => {
      const response = createMockLikeResponse();
      mockClient.setMutationResponse(wrapInGraphQLSuccess({ likePost: response }));

      const result = await service.likePost('post-123');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.success).toBe(true);
        expect(result.data.isLiked).toBe(true);
        expect(result.data.likesCount).toBe(1);
      }
    });

    it('should pass postId to mutation', async () => {
      const response = createMockLikeResponse();
      mockClient.setMutationResponse(wrapInGraphQLSuccess({ likePost: response }));

      await service.likePost('post-456');

      const lastCall = mockClient.lastMutationCall;
      expect(lastCall).toBeDefined();
      expect(lastCall?.variables.postId).toBe('post-456');
    });

    it('should handle like with multiple existing likes', async () => {
      const response = createMockLikeResponse({ likesCount: 42 });
      mockClient.setMutationResponse(wrapInGraphQLSuccess({ likePost: response }));

      const result = await service.likePost('post-123');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.likesCount).toBe(42);
        expect(result.data.isLiked).toBe(true);
      }
    });

    it('should handle errors during like', async () => {
      mockClient.setMutationResponse(
        wrapInGraphQLError('Failed to like post', 'INTERNAL_SERVER_ERROR')
      );

      const result = await service.likePost('post-123');

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.message).toBe('Failed to like post');
        expect(result.error.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });

    it('should handle post not found', async () => {
      mockClient.setMutationResponse(
        wrapInGraphQLError('Post not found', 'NOT_FOUND')
      );

      const result = await service.likePost('nonexistent');

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.message).toBe('Post not found');
        expect(result.error.extensions?.code).toBe('NOT_FOUND');
      }
    });

    it('should handle authentication errors', async () => {
      mockClient.setMutationResponse(
        wrapInGraphQLError('Not authenticated', 'UNAUTHENTICATED')
      );

      const result = await service.likePost('post-123');

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.message).toBe('Not authenticated');
        expect(result.error.extensions?.code).toBe('UNAUTHENTICATED');
      }
    });
  });

  describe('unlikePost', () => {
    it('should unlike a post successfully', async () => {
      const response = createMockUnlikeResponse();
      mockClient.setMutationResponse(wrapInGraphQLSuccess({ unlikePost: response }));

      const result = await service.unlikePost('post-123');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.success).toBe(true);
        expect(result.data.isLiked).toBe(false);
        expect(result.data.likesCount).toBe(0);
      }
    });

    it('should pass postId to mutation', async () => {
      const response = createMockUnlikeResponse();
      mockClient.setMutationResponse(wrapInGraphQLSuccess({ unlikePost: response }));

      await service.unlikePost('post-789');

      const lastCall = mockClient.lastMutationCall;
      expect(lastCall).toBeDefined();
      expect(lastCall?.variables.postId).toBe('post-789');
    });

    it('should handle unlike with remaining likes', async () => {
      const response = createMockUnlikeResponse({ likesCount: 15 });
      mockClient.setMutationResponse(wrapInGraphQLSuccess({ unlikePost: response }));

      const result = await service.unlikePost('post-123');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.likesCount).toBe(15);
        expect(result.data.isLiked).toBe(false);
      }
    });

    it('should handle errors during unlike', async () => {
      mockClient.setMutationResponse(
        wrapInGraphQLError('Failed to unlike post', 'INTERNAL_SERVER_ERROR')
      );

      const result = await service.unlikePost('post-123');

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.message).toBe('Failed to unlike post');
        expect(result.error.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });

    it('should handle post not found', async () => {
      mockClient.setMutationResponse(
        wrapInGraphQLError('Post not found', 'NOT_FOUND')
      );

      const result = await service.unlikePost('nonexistent');

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.message).toBe('Post not found');
        expect(result.error.extensions?.code).toBe('NOT_FOUND');
      }
    });

    it('should handle authentication errors', async () => {
      mockClient.setMutationResponse(
        wrapInGraphQLError('Not authenticated', 'UNAUTHENTICATED')
      );

      const result = await service.unlikePost('post-123');

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.message).toBe('Not authenticated');
        expect(result.error.extensions?.code).toBe('UNAUTHENTICATED');
      }
    });
  });

  describe('getLikeStatus', () => {
    it('should fetch like status for a liked post', async () => {
      const status = createMockLikedStatus(25);
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ postLikeStatus: status }));

      const result = await service.getLikeStatus('post-123');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.isLiked).toBe(true);
        expect(result.data.likesCount).toBe(25);
      }
    });

    it('should fetch like status for an unliked post', async () => {
      const status = createMockUnlikedStatus(10);
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ postLikeStatus: status }));

      const result = await service.getLikeStatus('post-456');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.isLiked).toBe(false);
        expect(result.data.likesCount).toBe(10);
      }
    });

    it('should fetch like status for post with no likes', async () => {
      const status = createMockUnlikedStatus(0);
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ postLikeStatus: status }));

      const result = await service.getLikeStatus('post-789');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.isLiked).toBe(false);
        expect(result.data.likesCount).toBe(0);
      }
    });

    it('should pass postId to query', async () => {
      const status = createMockUnlikedStatus();
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ postLikeStatus: status }));

      await service.getLikeStatus('post-999');

      const lastCall = mockClient.lastQueryCall;
      expect(lastCall).toBeDefined();
      expect(lastCall?.variables.postId).toBe('post-999');
    });

    it('should handle post not found', async () => {
      mockClient.setQueryResponse(
        wrapInGraphQLError('Post not found', 'NOT_FOUND')
      );

      const result = await service.getLikeStatus('nonexistent');

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.message).toBe('Post not found');
        expect(result.error.extensions?.code).toBe('NOT_FOUND');
      }
    });

    it('should handle errors fetching like status', async () => {
      mockClient.setQueryResponse(
        wrapInGraphQLError('Failed to fetch like status', 'INTERNAL_SERVER_ERROR')
      );

      const result = await service.getLikeStatus('post-123');

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.message).toBe('Failed to fetch like status');
        expect(result.error.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('integration scenarios', () => {
    it('should handle like then fetch status workflow', async () => {
      const likeResponse = createMockLikeResponse({ likesCount: 1 });
      mockClient.setMutationResponse(wrapInGraphQLSuccess({ likePost: likeResponse }));

      const likeResult = await service.likePost('post-123');
      expect(likeResult.status).toBe('success');

      const status = createMockLikedStatus(1);
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ postLikeStatus: status }));

      const statusResult = await service.getLikeStatus('post-123');
      expect(statusResult.status).toBe('success');
      if (likeResult.status === 'success' && statusResult.status === 'success') {
        expect(statusResult.data.isLiked).toBe(true);
        expect(statusResult.data.likesCount).toBe(likeResult.data.likesCount);
      }
    });

    it('should handle like then unlike workflow', async () => {
      const likeResponse = createMockLikeResponse({ likesCount: 26 });
      mockClient.setMutationResponse(wrapInGraphQLSuccess({ likePost: likeResponse }));

      const likeResult = await service.likePost('post-123');
      expect(likeResult.status).toBe('success');

      const unlikeResponse = createMockUnlikeResponse({ likesCount: 25 });
      mockClient.setMutationResponse(wrapInGraphQLSuccess({ unlikePost: unlikeResponse }));

      const unlikeResult = await service.unlikePost('post-123');
      expect(unlikeResult.status).toBe('success');
      if (unlikeResult.status === 'success') {
        expect(unlikeResult.data.isLiked).toBe(false);
        expect(unlikeResult.data.likesCount).toBe(25);
      }
    });
  });
});
