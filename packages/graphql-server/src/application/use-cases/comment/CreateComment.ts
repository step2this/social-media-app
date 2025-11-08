/**
 * CreateComment Use Case
 *
 * Creates a comment on a post.
 */

import { AsyncResult, UserId, PostId } from '../../../shared/types/index.js';

export interface CreateCommentInput {
  userId: UserId;
  postId: PostId;
  content: string;
}

export interface CreateCommentOutput {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentServices {
  profileService: {
    getProfileById(userId: string): Promise<{ handle: string } | null>;
  };
  postService: {
    getPostById(postId: string): Promise<{ userId: string; createdAt: string; id: string } | null>;
  };
  commentService: {
    createComment(
      userId: string,
      postId: string,
      handle: string,
      content: string,
      postUserId: string,
      postSK: string
    ): Promise<CreateCommentOutput>;
  };
}

export class CreateComment {
  constructor(private readonly services: CreateCommentServices) {}

  async execute(input: CreateCommentInput): AsyncResult<CreateCommentOutput> {
    try {
      // Get user profile for handle
      const profile = await this.services.profileService.getProfileById(input.userId);
      if (!profile) {
        return {
          success: false,
          error: new Error('User profile not found'),
        };
      }

      // Get post to extract postUserId and postSK
      const post = await this.services.postService.getPostById(input.postId);
      if (!post) {
        return {
          success: false,
          error: new Error('Post not found'),
        };
      }

      // Create comment with all required parameters
      const comment = await this.services.commentService.createComment(
        input.userId,
        input.postId,
        profile.handle,
        input.content,
        post.userId,
        `POST#${post.createdAt}#${post.id}`
      );

      return {
        success: true,
        data: comment,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to create comment'),
      };
    }
  }
}
