/**
 * Post Service Tests
 *
 * Comprehensive tests for GraphQL-based Post service.
 * Uses dependency injection and factory pattern for DRY testing.
 * Tests behavior, not implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { IPostService } from '../interfaces/IPostService';
import { PostServiceGraphQL } from '../implementations/PostService.graphql.ts';
import { MockGraphQLClient } from '../../graphql/client.mock';
import {
  createMockPost,
  createMockPosts,
  createMockPostByUser,
  createMockCreatePostInput,
  createMockUpdatePostInput,
  createMockCreatePostPayload,
  createMockPostConnection,
} from './fixtures/postFixtures';
import { wrapInGraphQLSuccess } from './fixtures/graphqlFixtures';
import {
  expectServiceError,
  errorScenarios,
} from './helpers/serviceTestHelpers';

// Type definitions for mock client generic calls
interface CreatePostVariables {
  input: {
    caption?: string;
    fileType: string;
  };
}

interface GetPostVariables {
  id: string;
}

interface GetUserPostsVariables {
  handle: string;
  limit: number;
  cursor?: string;
}

interface UpdatePostVariables {
  id: string;
  input: {
    caption?: string;
  };
}

interface DeletePostVariables {
  id: string;
}

describe('PostService.graphql', () => {
  let service: IPostService;
  let mockClient: MockGraphQLClient;

  beforeEach(() => {
    mockClient = new MockGraphQLClient();
    service = new PostServiceGraphQL(mockClient);
  });

  describe('createPost', () => {
    it('should create a post successfully', async () => {
      const input = createMockCreatePostInput();
      const payload = createMockCreatePostPayload({
        post: createMockPost({ caption: input.caption }),
      });

      mockClient.setMutationResponse(wrapInGraphQLSuccess({ createPost: payload }));

      const result = await service.createPost(input);

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.post.id).toBe('post-1');
        expect(result.data.post.caption).toBe(input.caption);
        expect(result.data.uploadUrl).toBe('https://s3.amazonaws.com/upload/post-image');
        expect(result.data.thumbnailUploadUrl).toBe(
          'https://s3.amazonaws.com/upload/post-thumbnail'
        );
      }
    });

    it('should create a post without caption', async () => {
      const input = createMockCreatePostInput({ caption: undefined });
      const payload = createMockCreatePostPayload({
        post: createMockPost({ caption: null }),
      });

      mockClient.setMutationResponse(wrapInGraphQLSuccess({ createPost: payload }));

      const result = await service.createPost(input);

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.post.caption).toBeNull();
      }
    });

    it('should pass fileType to mutation', async () => {
      const input = createMockCreatePostInput({ fileType: 'image/png' });
      const payload = createMockCreatePostPayload();

      mockClient.setMutationResponse(wrapInGraphQLSuccess({ createPost: payload }));

      await service.createPost(input);

      const lastCall = mockClient.lastMutationCall<CreatePostVariables>();
      expect(lastCall).toBeDefined();
      expect(lastCall?.variables.input.fileType).toBe('image/png');
    });

    it('should handle errors during post creation', async () => {
      const input = createMockCreatePostInput();
      await expectServiceError(
        mockClient,
        () => service.createPost(input),
        errorScenarios.server.createPost.message,
        errorScenarios.server.createPost.code
      );
    });

    it('should handle network errors', async () => {
      const input = createMockCreatePostInput();
      await expectServiceError(
        mockClient,
        () => service.createPost(input),
        errorScenarios.network.error.message,
        errorScenarios.network.error.code
      );
    });
  });

  describe('getPost', () => {
    it('should fetch a single post by ID', async () => {
      const post = createMockPost({ id: 'post-123' });
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ post }));

      const result = await service.getPost('post-123');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.id).toBe('post-123');
        expect(result.data.caption).toBe('Test post caption');
        expect(result.data.author.handle).toBe('testuser');
      }
    });

    it('should pass post ID to query', async () => {
      const post = createMockPost();
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ post }));

      await service.getPost('post-456');

      const lastCall = mockClient.lastQueryCall<GetPostVariables>();
      expect(lastCall).toBeDefined();
      expect(lastCall?.variables.id).toBe('post-456');
    });

    it('should handle post not found', async () => {
      await expectServiceError(
        mockClient,
        () => service.getPost('nonexistent'),
        errorScenarios.notFound.post.message,
        errorScenarios.notFound.post.code,
        'query'
      );
    });

    it('should return post with likes and comments counts', async () => {
      const post = createMockPost({
        likesCount: 42,
        commentsCount: 15,
        isLiked: true,
      });
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ post }));

      const result = await service.getPost('post-123');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.likesCount).toBe(42);
        expect(result.data.commentsCount).toBe(15);
        expect(result.data.isLiked).toBe(true);
      }
    });
  });

  describe('getUserPosts', () => {
    it('should fetch posts for a user', async () => {
      const posts = createMockPosts(3);
      const connection = createMockPostConnection(posts);
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ userPosts: connection }));

      const result = await service.getUserPosts('johndoe');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.edges).toHaveLength(3);
        expect(result.data.pageInfo.hasNextPage).toBe(false);
      }
    });

    it('should pass handle and limit to query', async () => {
      const posts = createMockPosts(24);
      const connection = createMockPostConnection(posts);
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ userPosts: connection }));

      await service.getUserPosts('janedoe', 24);

      const lastCall = mockClient.lastQueryCall<GetUserPostsVariables>();
      expect(lastCall).toBeDefined();
      expect(lastCall?.variables.handle).toBe('janedoe');
      expect(lastCall?.variables.limit).toBe(24);
    });

    it('should use default limit of 24 if not provided', async () => {
      const posts = createMockPosts(24);
      const connection = createMockPostConnection(posts);
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ userPosts: connection }));

      await service.getUserPosts('johndoe');

      const lastCall = mockClient.lastQueryCall<GetUserPostsVariables>();
      expect(lastCall?.variables.limit).toBe(24);
    });

    it('should handle pagination with cursor', async () => {
      const posts = createMockPosts(24);
      const connection = createMockPostConnection(posts, true);
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ userPosts: connection }));

      const result = await service.getUserPosts(
        'johndoe',
        24,
        'encoded-cursor'
      );

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.pageInfo.hasNextPage).toBe(true);
        expect(result.data.edges).toHaveLength(24);
      }

      const lastCall = mockClient.lastQueryCall<GetUserPostsVariables>();
      expect(lastCall?.variables.cursor).toBe('encoded-cursor');
    });

    it('should handle empty results', async () => {
      const connection = createMockPostConnection([]);
      mockClient.setQueryResponse(wrapInGraphQLSuccess({ userPosts: connection }));

      const result = await service.getUserPosts('emptyuser');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.edges).toHaveLength(0);
        expect(result.data.pageInfo.hasNextPage).toBe(false);
      }
    });

    it('should handle errors fetching user posts', async () => {
      mockClient.setQueryResponse(
        wrapInGraphQLError('User not found', 'NOT_FOUND')
      );

      const result = await service.getUserPosts('nonexistent');

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.message).toBe('User not found');
      }
    });
  });

  describe('updatePost', () => {
    it('should update a post successfully', async () => {
      const input = createMockUpdatePostInput({ caption: 'Updated caption' });
      const updatedPost = createMockPost({ caption: 'Updated caption' });
      mockClient.setMutationResponse(
        wrapInGraphQLSuccess({ updatePost: updatedPost })
      );

      const result = await service.updatePost('post-123', input);

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.id).toBe('post-1');
        expect(result.data.caption).toBe('Updated caption');
      }
    });

    it('should pass post ID and caption to mutation', async () => {
      const input = createMockUpdatePostInput({ caption: 'New caption' });
      const updatedPost = createMockPost({ caption: 'New caption' });
      mockClient.setMutationResponse(
        wrapInGraphQLSuccess({ updatePost: updatedPost })
      );

      await service.updatePost('post-456', input);

      const lastCall = mockClient.lastMutationCall<UpdatePostVariables>();
      expect(lastCall).toBeDefined();
      expect(lastCall?.variables.id).toBe('post-456');
      expect(lastCall?.variables.input.caption).toBe('New caption');
    });

    it('should handle permission errors', async () => {
      const input = createMockUpdatePostInput();
      await expectServiceError(
        mockClient,
        () => service.updatePost('post-123', input),
        errorScenarios.permission.forbiddenUpdate.message,
        errorScenarios.permission.forbiddenUpdate.code
      );
    });

    it('should handle post not found during update', async () => {
      const input = createMockUpdatePostInput();
      await expectServiceError(
        mockClient,
        () => service.updatePost('nonexistent', input),
        errorScenarios.notFound.post.message,
        errorScenarios.notFound.post.code
      );
    });
  });

  describe('deletePost', () => {
    it('should delete a post successfully', async () => {
      mockClient.setMutationResponse(
        wrapInGraphQLSuccess({ deletePost: { success: true } })
      );

      const result = await service.deletePost('post-123');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data).toBe(true);
      }
    });

    it('should pass post ID to mutation', async () => {
      mockClient.setMutationResponse(
        wrapInGraphQLSuccess({ deletePost: { success: true } })
      );

      await service.deletePost('post-789');

      const lastCall = mockClient.lastMutationCall<DeletePostVariables>();
      expect(lastCall).toBeDefined();
      expect(lastCall?.variables.id).toBe('post-789');
    });

    it('should handle permission errors', async () => {
      await expectServiceError(
        mockClient,
        () => service.deletePost('post-123'),
        errorScenarios.permission.forbiddenDelete.message,
        errorScenarios.permission.forbiddenDelete.code
      );
    });

    it('should handle post not found during deletion', async () => {
      await expectServiceError(
        mockClient,
        () => service.deletePost('nonexistent'),
        errorScenarios.notFound.post.message,
        errorScenarios.notFound.post.code
      );
    });

    it('should handle deletion failures', async () => {
      mockClient.setMutationResponse(
        wrapInGraphQLSuccess({ deletePost: { success: false } })
      );

      const result = await service.deletePost('post-123');

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data).toBe(false);
      }
    });
  });

  describe('integration scenarios', () => {
    it('should handle creating and fetching a post', async () => {
      const input = createMockCreatePostInput();
      const payload = createMockCreatePostPayload();
      mockClient.setMutationResponse(wrapInGraphQLSuccess({ createPost: payload }));

      const createResult = await service.createPost(input);
      expect(createResult.status).toBe('success');

      mockClient.setQueryResponse(
        wrapInGraphQLSuccess({ post: payload.post })
      );

      const fetchResult = await service.getPost('post-1');
      expect(fetchResult.status).toBe('success');
      if (createResult.status === 'success' && fetchResult.status === 'success') {
        expect(fetchResult.data.id).toBe(createResult.data.post.id);
      }
    });

    it('should handle updating and deleting a post', async () => {
      const updateInput = createMockUpdatePostInput();
      const updatedPost = createMockPost({ caption: updateInput.caption });
      mockClient.setMutationResponse(
        wrapInGraphQLSuccess({ updatePost: updatedPost })
      );

      const updateResult = await service.updatePost('post-1', updateInput);
      expect(updateResult.status).toBe('success');

      mockClient.setMutationResponse(
        wrapInGraphQLSuccess({ deletePost: { success: true } })
      );

      const deleteResult = await service.deletePost('post-1');
      expect(deleteResult.status).toBe('success');
      if (deleteResult.status === 'success') {
        expect(deleteResult.data).toBe(true);
      }
    });
  });
});
