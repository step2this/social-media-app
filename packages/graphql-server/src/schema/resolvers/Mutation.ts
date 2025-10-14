/**
 * Mutation Resolvers
 *
 * Implements all root-level Mutation resolvers for the GraphQL schema.
 * Handles write operations for posts, comments, likes, and follows.
 */

import { GraphQLError } from 'graphql';
import type { MutationResolvers } from '../generated/types.js';

/**
 * Mutation resolvers
 *
 * Implements:
 * - createPost(input: CreatePostInput!): CreatePostPayload!
 * - updatePost(id: ID!, input: UpdatePostInput!): Post!
 * - deletePost(id: ID!): DeleteResponse!
 * - createComment(input: CreateCommentInput!): Comment!
 * - deleteComment(id: ID!): DeleteResponse!
 * - likePost(postId: ID!): LikeResponse!
 * - unlikePost(postId: ID!): LikeResponse!
 * - followUser(userId: ID!): FollowResponse!
 * - unfollowUser(userId: ID!): FollowResponse!
 */
export const Mutation: MutationResolvers = {
  /**
   * Create a new post
   * Requires authentication
   */
  createPost: async (_parent, args, context) => {
    if (!context.userId) {
      throw new GraphQLError('You must be authenticated to create a post', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Create post
    const result = await context.services.postService.createPost({
      userId: context.userId,
      fileType: args.input.fileType,
      caption: args.input.caption,
    });

    return result;
  },

  /**
   * Update an existing post
   * Requires authentication and ownership
   */
  updatePost: async (_parent, args, context) => {
    if (!context.userId) {
      throw new GraphQLError('You must be authenticated to update a post', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Update post (service handles ownership check)
    const result = await context.services.postService.updatePost(
      args.id,
      context.userId,
      {
        caption: args.input.caption,
      }
    );

    if (!result) {
      throw new GraphQLError('Post not found or you do not have permission to update it', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return result;
  },

  /**
   * Delete a post
   * Requires authentication and ownership
   */
  deletePost: async (_parent, args, context) => {
    if (!context.userId) {
      throw new GraphQLError('You must be authenticated to delete a post', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Delete post (service handles ownership check)
    const success = await context.services.postService.deletePost(args.id, context.userId);

    if (!success) {
      throw new GraphQLError('Post not found or you do not have permission to delete it', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return { success: true };
  },

  /**
   * Like a post
   * Requires authentication
   */
  likePost: async (_parent, args, context) => {
    if (!context.userId) {
      throw new GraphQLError('You must be authenticated to like a post', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Like post (service handles getting post metadata)
    const result = await context.services.likeService.likePost(
      context.userId,
      args.postId,
      '', // postUserId - service will fetch this
      ''  // postSK - service will fetch this
    );

    return result;
  },

  /**
   * Unlike a post
   * Requires authentication
   */
  unlikePost: async (_parent, args, context) => {
    if (!context.userId) {
      throw new GraphQLError('You must be authenticated to unlike a post', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Unlike post
    const result = await context.services.likeService.unlikePost(context.userId, args.postId);

    return result;
  },

  /**
   * Follow a user
   * Requires authentication
   */
  followUser: async (_parent, args, context) => {
    if (!context.userId) {
      throw new GraphQLError('You must be authenticated to follow a user', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Cannot follow yourself
    if (context.userId === args.userId) {
      throw new GraphQLError('You cannot follow yourself', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    // Follow user
    const result = await context.services.followService.followUser(context.userId, args.userId);

    return result;
  },

  /**
   * Unfollow a user
   * Requires authentication
   */
  unfollowUser: async (_parent, args, context) => {
    if (!context.userId) {
      throw new GraphQLError('You must be authenticated to unfollow a user', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Unfollow user
    const result = await context.services.followService.unfollowUser(context.userId, args.userId);

    return result;
  },

  /**
   * Create a comment
   * Requires authentication
   */
  createComment: async (_parent, args, context) => {
    if (!context.userId) {
      throw new GraphQLError('You must be authenticated to create a comment', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Create comment
    const result = await context.services.commentService.createComment({
      userId: context.userId,
      postId: args.input.postId,
      content: args.input.content,
    });

    return result;
  },

  /**
   * Delete a comment
   * Requires authentication and ownership
   */
  deleteComment: async (_parent, args, context) => {
    if (!context.userId) {
      throw new GraphQLError('You must be authenticated to delete a comment', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Delete comment (service handles ownership check)
    const success = await context.services.commentService.deleteComment(args.id, context.userId);

    if (!success) {
      throw new GraphQLError('Comment not found or you do not have permission to delete it', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return { success: true };
  },
};
