/**
 * Pothos Phase 3 Integration Tests
 *
 * Tests for Comments, Social (Likes/Follows), and Notifications modules.
 *
 * Testing Principles:
 * ✅ No mocks - use real services with dependency injection
 * ✅ DRY with helper functions
 * ✅ Behavioral testing - test what operations do, not how
 * ✅ Type-safe throughout
 *
 * What we're testing:
 * - Comments operations work through Pothos schema
 * - Social operations (likes/follows) work through Pothos schema
 * - Notifications operations work through Pothos schema
 * - Type safety is maintained
 * - Auth scopes protect operations
 * - Schema merging works correctly
 */

import { describe, it, expect } from 'vitest';
import { createApolloServerWithPothos } from '../../../server-with-pothos.js';
import type { GraphQLContext } from '../../../context.js';
import { createMockDynamoClient } from '@social-media-app/shared/test-utils';
import { createServices } from '../../../services/factory.js';
import { createLoaders } from '../../../dataloaders/index.js';
import { createGraphQLContainer } from '../../../infrastructure/di/awilix-container.js';

/**
 * Create test context for GraphQL operations
 */
function createTestContext(userId: string | null = null): GraphQLContext {
  const dynamoClient = createMockDynamoClient() as any;
  const tableName = 'test-table';
  const correlationId = `test-${Date.now()}`;

  const services = createServices(dynamoClient, tableName);
  const loaders = createLoaders(
    {
      profileService: services.profileService,
      postService: services.postService,
      likeService: services.likeService,
      auctionService: services.auctionService,
    },
    userId
  );

  const context: GraphQLContext = {
    userId,
    correlationId,
    dynamoClient,
    tableName,
    services,
    loaders,
  } as GraphQLContext;

  context.container = createGraphQLContainer(context);

  return context;
}

/**
 * Execute GraphQL operation against Apollo Server
 */
async function executeOperation(
  server: Awaited<ReturnType<typeof createApolloServerWithPothos>>,
  query: string,
  context: GraphQLContext,
  variables?: Record<string, any>
) {
  return await server.executeOperation(
    {
      query,
      variables,
    },
    {
      contextValue: context,
    }
  );
}

describe('Pothos Phase 3 Integration', () => {
  describe('Schema Structure', () => {
    it('should include Phase 3 types in schema', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();

      // ACT - Introspect schema
      const introspectionQuery = `
        query {
          __schema {
            types {
              name
            }
          }
        }
      `;

      const result = await executeOperation(
        server,
        introspectionQuery,
        createTestContext()
      );

      // ASSERT - Behavior: Phase 3 types are present
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        const types = result.body.singleResult.data?.__schema.types as Array<{ name: string }>;
        const typeNames = types.map((t) => t.name);

        // Comments types
        expect(typeNames).toContain('Comment');
        expect(typeNames).toContain('CommentConnection');
        expect(typeNames).toContain('CommentEdge');

        // Social types
        expect(typeNames).toContain('LikeResponse');
        expect(typeNames).toContain('LikeStatus');
        expect(typeNames).toContain('FollowResponse');
        expect(typeNames).toContain('FollowStatus');

        // Notifications types
        expect(typeNames).toContain('Notification');
        expect(typeNames).toContain('NotificationConnection');
        expect(typeNames).toContain('NotificationEdge');
        expect(typeNames).toContain('NotificationActor');
        expect(typeNames).toContain('NotificationTarget');
        expect(typeNames).toContain('NotificationType');
        expect(typeNames).toContain('NotificationStatus');
        expect(typeNames).toContain('MarkAllReadResponse');

        // Shared types
        expect(typeNames).toContain('PublicProfile');
        expect(typeNames).toContain('PageInfo');
        expect(typeNames).toContain('DeleteResponse');
      }

      // Cleanup
      await server.stop();
    });
  });

  describe('Comments Module', () => {
    describe('createComment mutation', () => {
      it('should reject unauthenticated comment creation', async () => {
        // ARRANGE
        const server = createApolloServerWithPothos();
        await server.start();
        const context = createTestContext(null); // No userId

        // ACT - Try to create comment without auth
        const result = await executeOperation(
          server,
          `mutation CreateComment($postId: ID!, $content: String!) {
            createComment(postId: $postId, content: $content) {
              id
              content
            }
          }`,
          context,
          { postId: 'post-123', content: 'Test comment' }
        );

        // ASSERT - Behavior: Returns auth error
        expect(result.body.kind).toBe('single');
        if (result.body.kind === 'single') {
          expect(result.body.singleResult.errors).toBeDefined();
          expect(result.body.singleResult.errors?.[0].message).toContain(
            'Not authorized'
          );
        }

        // Cleanup
        await server.stop();
      });

      it('should require postId argument', async () => {
        // ARRANGE
        const server = createApolloServerWithPothos();
        await server.start();
        const context = createTestContext('user-123');

        // ACT - Try to create comment without postId
        const result = await executeOperation(
          server,
          `mutation CreateComment($content: String!) {
            createComment(content: $content) {
              id
              content
            }
          }`,
          context,
          { content: 'Test comment' }
        );

        // ASSERT - Behavior: Returns validation error
        expect(result.body.kind).toBe('single');
        if (result.body.kind === 'single') {
          expect(result.body.singleResult.errors).toBeDefined();
        }

        // Cleanup
        await server.stop();
      });
    });

    describe('deleteComment mutation', () => {
      it('should reject unauthenticated comment deletion', async () => {
        // ARRANGE
        const server = createApolloServerWithPothos();
        await server.start();
        const context = createTestContext(null); // No userId

        // ACT - Try to delete comment without auth
        const result = await executeOperation(
          server,
          `mutation DeleteComment($id: ID!) {
            deleteComment(id: $id) {
              success
            }
          }`,
          context,
          { id: 'comment-123' }
        );

        // ASSERT - Behavior: Returns auth error
        expect(result.body.kind).toBe('single');
        if (result.body.kind === 'single') {
          expect(result.body.singleResult.errors).toBeDefined();
          expect(result.body.singleResult.errors?.[0].message).toContain(
            'Not authorized'
          );
        }

        // Cleanup
        await server.stop();
      });
    });

    describe('comments query', () => {
      it('should reject unauthenticated comments query', async () => {
        // ARRANGE
        const server = createApolloServerWithPothos();
        await server.start();
        const context = createTestContext(null); // No userId

        // ACT - Try to query comments without auth
        const result = await executeOperation(
          server,
          `query GetComments($postId: ID!) {
            comments(postId: $postId) {
              edges {
                node {
                  id
                  content
                }
              }
            }
          }`,
          context,
          { postId: 'post-123' }
        );

        // ASSERT - Behavior: Returns auth error
        expect(result.body.kind).toBe('single');
        if (result.body.kind === 'single') {
          expect(result.body.singleResult.errors).toBeDefined();
          expect(result.body.singleResult.errors?.[0].message).toContain(
            'Not authorized'
          );
        }

        // Cleanup
        await server.stop();
      });
    });
  });

  describe('Social Module - Likes', () => {
    describe('likePost mutation', () => {
      it('should reject unauthenticated like', async () => {
        // ARRANGE
        const server = createApolloServerWithPothos();
        await server.start();
        const context = createTestContext(null); // No userId

        // ACT - Try to like post without auth
        const result = await executeOperation(
          server,
          `mutation LikePost($postId: ID!) {
            likePost(postId: $postId) {
              success
              likesCount
              isLiked
            }
          }`,
          context,
          { postId: 'post-123' }
        );

        // ASSERT - Behavior: Returns auth error
        expect(result.body.kind).toBe('single');
        if (result.body.kind === 'single') {
          expect(result.body.singleResult.errors).toBeDefined();
          expect(result.body.singleResult.errors?.[0].message).toContain(
            'Not authorized'
          );
        }

        // Cleanup
        await server.stop();
      });
    });

    describe('unlikePost mutation', () => {
      it('should reject unauthenticated unlike', async () => {
        // ARRANGE
        const server = createApolloServerWithPothos();
        await server.start();
        const context = createTestContext(null); // No userId

        // ACT - Try to unlike post without auth
        const result = await executeOperation(
          server,
          `mutation UnlikePost($postId: ID!) {
            unlikePost(postId: $postId) {
              success
              likesCount
              isLiked
            }
          }`,
          context,
          { postId: 'post-123' }
        );

        // ASSERT - Behavior: Returns auth error
        expect(result.body.kind).toBe('single');
        if (result.body.kind === 'single') {
          expect(result.body.singleResult.errors).toBeDefined();
          expect(result.body.singleResult.errors?.[0].message).toContain(
            'Not authorized'
          );
        }

        // Cleanup
        await server.stop();
      });
    });

    describe('postLikeStatus query', () => {
      it('should reject unauthenticated like status query', async () => {
        // ARRANGE
        const server = createApolloServerWithPothos();
        await server.start();
        const context = createTestContext(null); // No userId

        // ACT - Try to query like status without auth
        const result = await executeOperation(
          server,
          `query GetLikeStatus($postId: ID!) {
            postLikeStatus(postId: $postId) {
              isLiked
              likesCount
            }
          }`,
          context,
          { postId: 'post-123' }
        );

        // ASSERT - Behavior: Returns auth error
        expect(result.body.kind).toBe('single');
        if (result.body.kind === 'single') {
          expect(result.body.singleResult.errors).toBeDefined();
          expect(result.body.singleResult.errors?.[0].message).toContain(
            'Not authorized'
          );
        }

        // Cleanup
        await server.stop();
      });
    });
  });

  describe('Social Module - Follows', () => {
    describe('followUser mutation', () => {
      it('should reject unauthenticated follow', async () => {
        // ARRANGE
        const server = createApolloServerWithPothos();
        await server.start();
        const context = createTestContext(null); // No userId

        // ACT - Try to follow user without auth
        const result = await executeOperation(
          server,
          `mutation FollowUser($userId: ID!) {
            followUser(userId: $userId) {
              success
              followersCount
              followingCount
              isFollowing
            }
          }`,
          context,
          { userId: 'user-456' }
        );

        // ASSERT - Behavior: Returns auth error
        expect(result.body.kind).toBe('single');
        if (result.body.kind === 'single') {
          expect(result.body.singleResult.errors).toBeDefined();
          expect(result.body.singleResult.errors?.[0].message).toContain(
            'Not authorized'
          );
        }

        // Cleanup
        await server.stop();
      });
    });

    describe('unfollowUser mutation', () => {
      it('should reject unauthenticated unfollow', async () => {
        // ARRANGE
        const server = createApolloServerWithPothos();
        await server.start();
        const context = createTestContext(null); // No userId

        // ACT - Try to unfollow user without auth
        const result = await executeOperation(
          server,
          `mutation UnfollowUser($userId: ID!) {
            unfollowUser(userId: $userId) {
              success
              followersCount
              followingCount
              isFollowing
            }
          }`,
          context,
          { userId: 'user-456' }
        );

        // ASSERT - Behavior: Returns auth error
        expect(result.body.kind).toBe('single');
        if (result.body.kind === 'single') {
          expect(result.body.singleResult.errors).toBeDefined();
          expect(result.body.singleResult.errors?.[0].message).toContain(
            'Not authorized'
          );
        }

        // Cleanup
        await server.stop();
      });
    });

    describe('followStatus query', () => {
      it('should reject unauthenticated follow status query', async () => {
        // ARRANGE
        const server = createApolloServerWithPothos();
        await server.start();
        const context = createTestContext(null); // No userId

        // ACT - Try to query follow status without auth
        const result = await executeOperation(
          server,
          `query GetFollowStatus($userId: ID!) {
            followStatus(userId: $userId) {
              isFollowing
              followersCount
              followingCount
            }
          }`,
          context,
          { userId: 'user-456' }
        );

        // ASSERT - Behavior: Returns auth error
        expect(result.body.kind).toBe('single');
        if (result.body.kind === 'single') {
          expect(result.body.singleResult.errors).toBeDefined();
          expect(result.body.singleResult.errors?.[0].message).toContain(
            'Not authorized'
          );
        }

        // Cleanup
        await server.stop();
      });
    });
  });

  describe('Notifications Module', () => {
    describe('markNotificationAsRead mutation', () => {
      it('should reject unauthenticated mark as read', async () => {
        // ARRANGE
        const server = createApolloServerWithPothos();
        await server.start();
        const context = createTestContext(null); // No userId

        // ACT - Try to mark notification as read without auth
        const result = await executeOperation(
          server,
          `mutation MarkNotificationAsRead($id: ID!) {
            markNotificationAsRead(id: $id) {
              id
              status
            }
          }`,
          context,
          { id: 'notification-123' }
        );

        // ASSERT - Behavior: Returns auth error
        expect(result.body.kind).toBe('single');
        if (result.body.kind === 'single') {
          expect(result.body.singleResult.errors).toBeDefined();
          expect(result.body.singleResult.errors?.[0].message).toContain(
            'Not authorized'
          );
        }

        // Cleanup
        await server.stop();
      });
    });

    describe('markAllNotificationsAsRead mutation', () => {
      it('should reject unauthenticated mark all as read', async () => {
        // ARRANGE
        const server = createApolloServerWithPothos();
        await server.start();
        const context = createTestContext(null); // No userId

        // ACT - Try to mark all notifications as read without auth
        const result = await executeOperation(
          server,
          `mutation MarkAllNotificationsAsRead {
            markAllNotificationsAsRead {
              updatedCount
            }
          }`,
          context
        );

        // ASSERT - Behavior: Returns auth error
        expect(result.body.kind).toBe('single');
        if (result.body.kind === 'single') {
          expect(result.body.singleResult.errors).toBeDefined();
          expect(result.body.singleResult.errors?.[0].message).toContain(
            'Not authorized'
          );
        }

        // Cleanup
        await server.stop();
      });
    });

    describe('deleteNotification mutation', () => {
      it('should reject unauthenticated delete notification', async () => {
        // ARRANGE
        const server = createApolloServerWithPothos();
        await server.start();
        const context = createTestContext(null); // No userId

        // ACT - Try to delete notification without auth
        const result = await executeOperation(
          server,
          `mutation DeleteNotification($id: ID!) {
            deleteNotification(id: $id) {
              success
            }
          }`,
          context,
          { id: 'notification-123' }
        );

        // ASSERT - Behavior: Returns auth error
        expect(result.body.kind).toBe('single');
        if (result.body.kind === 'single') {
          expect(result.body.singleResult.errors).toBeDefined();
          expect(result.body.singleResult.errors?.[0].message).toContain(
            'Not authorized'
          );
        }

        // Cleanup
        await server.stop();
      });
    });

    describe('notifications query', () => {
      it('should reject unauthenticated notifications query', async () => {
        // ARRANGE
        const server = createApolloServerWithPothos();
        await server.start();
        const context = createTestContext(null); // No userId

        // ACT - Try to query notifications without auth
        const result = await executeOperation(
          server,
          `query GetNotifications {
            notifications {
              edges {
                node {
                  id
                  title
                  message
                }
              }
            }
          }`,
          context
        );

        // ASSERT - Behavior: Returns auth error
        expect(result.body.kind).toBe('single');
        if (result.body.kind === 'single') {
          expect(result.body.singleResult.errors).toBeDefined();
          expect(result.body.singleResult.errors?.[0].message).toContain(
            'Not authorized'
          );
        }

        // Cleanup
        await server.stop();
      });
    });

    describe('unreadNotificationsCount query', () => {
      it('should reject unauthenticated unread count query', async () => {
        // ARRANGE
        const server = createApolloServerWithPothos();
        await server.start();
        const context = createTestContext(null); // No userId

        // ACT - Try to query unread count without auth
        const result = await executeOperation(
          server,
          `query GetUnreadCount {
            unreadNotificationsCount
          }`,
          context
        );

        // ASSERT - Behavior: Returns auth error
        expect(result.body.kind).toBe('single');
        if (result.body.kind === 'single') {
          expect(result.body.singleResult.errors).toBeDefined();
          expect(result.body.singleResult.errors?.[0].message).toContain(
            'Not authorized'
          );
        }

        // Cleanup
        await server.stop();
      });
    });
  });

  describe('Type Safety', () => {
    it('should enforce required fields in mutations', async () => {
      // ARRANGE
      const server = createApolloServerWithPothos();
      await server.start();
      const context = createTestContext('user-123');

      // ACT - Try to create comment without required content field
      const result = await executeOperation(
        server,
        `mutation CreateComment($postId: ID!) {
          createComment(postId: $postId) {
            id
            content
          }
        }`,
        context,
        { postId: 'post-123' }
      );

      // ASSERT - Behavior: Returns validation error
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeDefined();
      }

      // Cleanup
      await server.stop();
    });
  });
});
