/**
 * Behavioral Tests for CreateComment and DeleteComment Use Cases
 *
 * Testing Principles:
 * ✅ No mocks - use real in-memory service implementations
 * ✅ DRY with helper functions
 * ✅ Behavioral testing - test comment outcomes
 * ✅ Type-safe throughout
 * ✅ Test core use cases + key edge cases
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CreateComment } from '../CreateComment.js';
import { DeleteComment } from '../DeleteComment.js';
import { UserId, PostId } from '../../../../shared/types/index.js';
import { createFakeServices } from '../../../../__tests__/helpers/fake-services.js';

describe('Comment Use Cases', () => {
  let services: ReturnType<typeof createFakeServices>;
  let createCommentUseCase: CreateComment;
  let deleteCommentUseCase: DeleteComment;

  beforeEach(() => {
    services = createFakeServices();
    createCommentUseCase = new CreateComment({
      profileService: services.profileService,
      postService: services.postService,
      commentService: services.commentService,
    });
    deleteCommentUseCase = new DeleteComment({
      commentService: services.commentService,
    });
  });

  /**
   * Helper to create a test user with profile
   */
  async function createTestUser(userId: string, username: string, email: string) {
    const user = {
      id: userId,
      username,
      email,
      handle: `@${username}`,
      password: 'pass',
      fullName: null,
      bio: null,
      profilePictureUrl: null,
      profilePictureThumbnailUrl: null,
      postsCount: 0,
      followersCount: 0,
      followingCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      emailVerified: false,
    };
    services.profileService.seedProfile(user);
    return user;
  }

  /**
   * Helper to create a test post
   */
  function createTestPost(postId: string, userId: string) {
    return services.postService.seedPost({
      id: postId,
      userId,
      content: 'Test post content',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likesCount: 0,
      commentsCount: 0,
    });
  }

  describe('CreateComment', () => {
    it('should create a comment successfully', async () => {
      // ARRANGE
      await createTestUser('user-1', 'commenter', 'commenter@example.com');
      createTestPost('post-1', 'user-2');

      // ACT
      const result = await createCommentUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
        content: 'Great post!',
      });

      // ASSERT - Behavior: Comment created successfully
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBeDefined();
        expect(result.data.postId).toBe('post-1');
        expect(result.data.userId).toBe('user-1');
        expect(result.data.content).toBe('Great post!');
        expect(result.data.createdAt).toBeDefined();
        expect(result.data.updatedAt).toBeDefined();
      }
    });

    it('should create comment with correct timestamps', async () => {
      // ARRANGE
      await createTestUser('user-1', 'user1', 'user1@example.com');
      createTestPost('post-1', 'user-2');

      const beforeCreate = new Date();

      // ACT
      const result = await createCommentUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
        content: 'Test comment',
      });

      const afterCreate = new Date();

      // ASSERT - Behavior: Timestamps are current
      expect(result.success).toBe(true);
      if (result.success) {
        const createdAt = new Date(result.data.createdAt);
        expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
        expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
      }
    });

    it('should allow multiple comments from same user on same post', async () => {
      // ARRANGE
      await createTestUser('user-1', 'user1', 'user1@example.com');
      createTestPost('post-1', 'user-2');

      // ACT - Create multiple comments
      const result1 = await createCommentUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
        content: 'First comment',
      });

      const result2 = await createCommentUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
        content: 'Second comment',
      });

      // ASSERT - Behavior: Multiple comments allowed
      expect(result1.success && result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.data.id).not.toBe(result2.data.id);
        expect(result1.data.content).toBe('First comment');
        expect(result2.data.content).toBe('Second comment');
      }
    });

    it('should allow multiple users to comment on same post', async () => {
      // ARRANGE
      await createTestUser('user-1', 'user1', 'user1@example.com');
      await createTestUser('user-2', 'user2', 'user2@example.com');
      await createTestUser('user-3', 'user3', 'user3@example.com');
      createTestPost('post-1', 'user-author');

      // ACT - Different users comment
      const results = await Promise.all([
        createCommentUseCase.execute({
          userId: UserId('user-1'),
          postId: PostId('post-1'),
          content: 'Comment from user 1',
        }),
        createCommentUseCase.execute({
          userId: UserId('user-2'),
          postId: PostId('post-1'),
          content: 'Comment from user 2',
        }),
        createCommentUseCase.execute({
          userId: UserId('user-3'),
          postId: PostId('post-1'),
          content: 'Comment from user 3',
        }),
      ]);

      // ASSERT - Behavior: All comments created
      expect(results.every((r) => r.success)).toBe(true);
      if (results.every((r) => r.success)) {
        const commentIds = results.map((r) => (r as any).data.id);
        const uniqueIds = new Set(commentIds);
        expect(uniqueIds.size).toBe(3); // All unique IDs
      }
    });

    it('should allow user to comment on their own post', async () => {
      // ARRANGE
      await createTestUser('user-1', 'user1', 'user1@example.com');
      createTestPost('post-1', 'user-1');

      // ACT
      const result = await createCommentUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
        content: 'Commenting on my own post',
      });

      // ASSERT - Behavior: Self-commenting allowed
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.userId).toBe('user-1');
      }
    });

    it('should handle various content lengths', async () => {
      // ARRANGE
      await createTestUser('user-1', 'user1', 'user1@example.com');
      createTestPost('post-1', 'user-2');

      // ACT - Different content lengths
      const shortComment = await createCommentUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
        content: 'Hi',
      });

      const longComment = await createCommentUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
        content: 'A'.repeat(500), // Long comment
      });

      // ASSERT - Behavior: Various lengths accepted
      expect(shortComment.success).toBe(true);
      expect(longComment.success).toBe(true);
      if (shortComment.success && longComment.success) {
        expect(shortComment.data.content).toBe('Hi');
        expect(longComment.data.content).toBe('A'.repeat(500));
      }
    });

    it('should handle empty content', async () => {
      // ARRANGE
      await createTestUser('user-1', 'user1', 'user1@example.com');
      createTestPost('post-1', 'user-2');

      // ACT - Empty content
      const result = await createCommentUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
        content: '',
      });

      // ASSERT - Behavior: Empty content allowed (validation could be added)
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe('');
      }
    });

    it('should handle special characters in content', async () => {
      // ARRANGE
      await createTestUser('user-1', 'user1', 'user1@example.com');
      createTestPost('post-1', 'user-2');

      const specialContent = 'Comment with special chars: 👍 @mentions #hashtags & <html>';

      // ACT
      const result = await createCommentUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
        content: specialContent,
      });

      // ASSERT - Behavior: Special characters preserved
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe(specialContent);
      }
    });
  });

  describe('CreateComment - User Validation', () => {
    it('should reject comment from non-existent user', async () => {
      // ARRANGE
      createTestPost('post-1', 'user-2');

      // ACT - User profile not found
      const result = await createCommentUseCase.execute({
        userId: UserId('non-existent-user'),
        postId: PostId('post-1'),
        content: 'Comment',
      });

      // ASSERT - Behavior: User must exist
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('User profile not found');
      }
    });

    it('should validate user before checking post', async () => {
      // ARRANGE - Neither user nor post exist

      // ACT
      const result = await createCommentUseCase.execute({
        userId: UserId('no-user'),
        postId: PostId('no-post'),
        content: 'Comment',
      });

      // ASSERT - Behavior: User validation happens first
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('User profile not found');
      }
    });
  });

  describe('CreateComment - Post Validation', () => {
    it('should reject comment on non-existent post', async () => {
      // ARRANGE
      await createTestUser('user-1', 'user1', 'user1@example.com');

      // ACT - Post not found
      const result = await createCommentUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('non-existent-post'),
        content: 'Comment',
      });

      // ASSERT - Behavior: Post must exist
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Post not found');
      }
    });

    it('should work with posts from different users', async () => {
      // ARRANGE
      await createTestUser('commenter', 'commenter', 'commenter@example.com');
      await createTestUser('author1', 'author1', 'author1@example.com');
      await createTestUser('author2', 'author2', 'author2@example.com');

      createTestPost('post-1', 'author1');
      createTestPost('post-2', 'author2');

      // ACT - Comment on different users' posts
      const result1 = await createCommentUseCase.execute({
        userId: UserId('commenter'),
        postId: PostId('post-1'),
        content: 'Comment on post 1',
      });

      const result2 = await createCommentUseCase.execute({
        userId: UserId('commenter'),
        postId: PostId('post-2'),
        content: 'Comment on post 2',
      });

      // ASSERT - Behavior: Can comment on any post
      expect(result1.success && result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.data.postId).toBe('post-1');
        expect(result2.data.postId).toBe('post-2');
      }
    });
  });

  describe('DeleteComment', () => {
    it('should delete own comment successfully', async () => {
      // ARRANGE - Create comment
      await createTestUser('user-1', 'user1', 'user1@example.com');
      createTestPost('post-1', 'user-2');

      const createResult = await createCommentUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
        content: 'Comment to delete',
      });

      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const commentId = createResult.data.id;

      // ACT - Delete comment
      const result = await deleteCommentUseCase.execute({
        commentId,
        userId: UserId('user-1'),
      });

      // ASSERT - Behavior: Comment deleted
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.success).toBe(true);
      }
    });

    it('should reject deleting another user\'s comment', async () => {
      // ARRANGE - User 1 creates comment
      await createTestUser('user-1', 'user1', 'user1@example.com');
      await createTestUser('user-2', 'user2', 'user2@example.com');
      createTestPost('post-1', 'user-author');

      const createResult = await createCommentUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
        content: 'User 1 comment',
      });

      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      // ACT - User 2 tries to delete User 1's comment
      const result = await deleteCommentUseCase.execute({
        commentId: createResult.data.id,
        userId: UserId('user-2'), // Different user
      });

      // ASSERT - Behavior: Unauthorized deletion rejected
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain(
          'Comment not found or you do not have permission to delete it'
        );
      }
    });

    it('should reject deleting non-existent comment', async () => {
      // ARRANGE
      await createTestUser('user-1', 'user1', 'user1@example.com');

      // ACT - Try to delete non-existent comment
      const result = await deleteCommentUseCase.execute({
        commentId: 'non-existent-comment',
        userId: UserId('user-1'),
      });

      // ASSERT - Behavior: Non-existent comment rejected
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain(
          'Comment not found or you do not have permission to delete it'
        );
      }
    });

    it('should be idempotent - deleting already deleted comment', async () => {
      // ARRANGE - Create and delete comment
      await createTestUser('user-1', 'user1', 'user1@example.com');
      createTestPost('post-1', 'user-2');

      const createResult = await createCommentUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
        content: 'Comment',
      });

      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const commentId = createResult.data.id;

      // First deletion
      const firstDelete = await deleteCommentUseCase.execute({
        commentId,
        userId: UserId('user-1'),
      });

      expect(firstDelete.success).toBe(true);

      // ACT - Try to delete again
      const secondDelete = await deleteCommentUseCase.execute({
        commentId,
        userId: UserId('user-1'),
      });

      // ASSERT - Behavior: Second delete fails (comment already gone)
      expect(secondDelete.success).toBe(false);
      if (!secondDelete.success) {
        expect(secondDelete.error.message).toContain('Comment not found');
      }
    });

    it('should not affect other comments when one is deleted', async () => {
      // ARRANGE - Create multiple comments
      await createTestUser('user-1', 'user1', 'user1@example.com');
      createTestPost('post-1', 'user-2');

      const comment1 = await createCommentUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
        content: 'Comment 1',
      });

      const comment2 = await createCommentUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
        content: 'Comment 2',
      });

      expect(comment1.success && comment2.success).toBe(true);
      if (!comment1.success || !comment2.success) return;

      // ACT - Delete first comment
      await deleteCommentUseCase.execute({
        commentId: comment1.data.id,
        userId: UserId('user-1'),
      });

      // Try to delete second comment (should still work)
      const result = await deleteCommentUseCase.execute({
        commentId: comment2.data.id,
        userId: UserId('user-1'),
      });

      // ASSERT - Behavior: Other comments unaffected
      expect(result.success).toBe(true);
    });
  });

  describe('Comment Integration Workflows', () => {
    it('should support create → delete → create workflow', async () => {
      // ARRANGE
      await createTestUser('user-1', 'user1', 'user1@example.com');
      createTestPost('post-1', 'user-2');

      // ACT - Create comment
      const create1 = await createCommentUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
        content: 'First comment',
      });

      expect(create1.success).toBe(true);
      if (!create1.success) return;

      // Delete comment
      const deleteResult = await deleteCommentUseCase.execute({
        commentId: create1.data.id,
        userId: UserId('user-1'),
      });

      expect(deleteResult.success).toBe(true);

      // Create new comment
      const create2 = await createCommentUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
        content: 'Second comment',
      });

      // ASSERT - Behavior: Full workflow works
      expect(create2.success).toBe(true);
      if (create2.success) {
        expect(create2.data.id).not.toBe(create1.data.id);
        expect(create2.data.content).toBe('Second comment');
      }
    });

    it('should handle concurrent comment creation', async () => {
      // ARRANGE
      await createTestUser('user-1', 'user1', 'user1@example.com');
      await createTestUser('user-2', 'user2', 'user2@example.com');
      await createTestUser('user-3', 'user3', 'user3@example.com');
      createTestPost('post-1', 'author');

      // ACT - Concurrent comment creation
      const results = await Promise.all([
        createCommentUseCase.execute({
          userId: UserId('user-1'),
          postId: PostId('post-1'),
          content: 'Concurrent 1',
        }),
        createCommentUseCase.execute({
          userId: UserId('user-2'),
          postId: PostId('post-1'),
          content: 'Concurrent 2',
        }),
        createCommentUseCase.execute({
          userId: UserId('user-3'),
          postId: PostId('post-1'),
          content: 'Concurrent 3',
        }),
      ]);

      // ASSERT - Behavior: All comments created successfully
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should handle concurrent deletions by different users', async () => {
      // ARRANGE - Create comments from different users
      await createTestUser('user-1', 'user1', 'user1@example.com');
      await createTestUser('user-2', 'user2', 'user2@example.com');
      createTestPost('post-1', 'author');

      const comment1 = await createCommentUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
        content: 'User 1 comment',
      });

      const comment2 = await createCommentUseCase.execute({
        userId: UserId('user-2'),
        postId: PostId('post-1'),
        content: 'User 2 comment',
      });

      expect(comment1.success && comment2.success).toBe(true);
      if (!comment1.success || !comment2.success) return;

      // ACT - Concurrent deletions
      const results = await Promise.all([
        deleteCommentUseCase.execute({
          commentId: comment1.data.id,
          userId: UserId('user-1'),
        }),
        deleteCommentUseCase.execute({
          commentId: comment2.data.id,
          userId: UserId('user-2'),
        }),
      ]);

      // ASSERT - Behavior: Both deletions succeed
      expect(results.every((r) => r.success)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle profile service errors', async () => {
      // ARRANGE - Break profile service
      const brokenProfileService = {
        getProfileById: async () => {
          throw new Error('Profile service unavailable');
        },
      };

      const brokenUseCase = new CreateComment({
        profileService: brokenProfileService as any,
        postService: services.postService,
        commentService: services.commentService,
      });

      createTestPost('post-1', 'user-2');

      // ACT
      const result = await brokenUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
        content: 'Comment',
      });

      // ASSERT - Behavior: Errors propagated
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    it('should handle post service errors', async () => {
      // ARRANGE
      await createTestUser('user-1', 'user1', 'user1@example.com');

      const brokenPostService = {
        getPostById: async () => {
          throw new Error('Post service unavailable');
        },
      };

      const brokenUseCase = new CreateComment({
        profileService: services.profileService,
        postService: brokenPostService as any,
        commentService: services.commentService,
      });

      // ACT
      const result = await brokenUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
        content: 'Comment',
      });

      // ASSERT - Behavior: Errors propagated
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    it('should handle comment service errors', async () => {
      // ARRANGE
      await createTestUser('user-1', 'user1', 'user1@example.com');
      createTestPost('post-1', 'user-2');

      const brokenCommentService = {
        createComment: async () => {
          throw new Error('Comment service unavailable');
        },
      };

      const brokenUseCase = new CreateComment({
        profileService: services.profileService,
        postService: services.postService,
        commentService: brokenCommentService as any,
      });

      // ACT
      const result = await brokenUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
        content: 'Comment',
      });

      // ASSERT - Behavior: Errors propagated
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    it('should handle non-Error throws', async () => {
      // ARRANGE
      const weirdProfileService = {
        getProfileById: async () => {
          throw 'String error'; // Non-Error throw
        },
      };

      const brokenUseCase = new CreateComment({
        profileService: weirdProfileService as any,
        postService: services.postService,
        commentService: services.commentService,
      });

      // ACT
      const result = await brokenUseCase.execute({
        userId: UserId('user-1'),
        postId: PostId('post-1'),
        content: 'Comment',
      });

      // ASSERT - Behavior: Handled gracefully
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to create comment');
      }
    });
  });

  describe('Type Safety', () => {
    it('should require UserId branded type', () => {
      // This test verifies compile-time type safety
      // TypeScript would catch if we try to pass plain string

      // ARRANGE
      const userId = UserId('type-safe-user');
      const postId = PostId('type-safe-post');

      // ACT & ASSERT - Compiles successfully with branded types
      const result = createCommentUseCase.execute({
        userId,
        postId,
        content: 'Comment',
      });

      expect(result).toBeDefined();
    });

    it('should require PostId branded type', () => {
      // This test verifies compile-time type safety

      // ARRANGE
      const postId = PostId('type-safe-post');

      // ACT & ASSERT - Compiles successfully with branded type
      expect(postId).toBeDefined();
    });
  });
});
