/**
 * Comment Service Interface
 *
 * Defines the contract for comment services.
 * Supports dependency injection pattern for easy testing.
 */

import type { AsyncState } from '../../graphql/types';
import type { Comment } from '@social-media-app/shared';

/**
 * Result type for create comment operation
 */
export interface CreateCommentResult {
  comment: Comment;
  commentsCount: number;
}

/**
 * Result type for get comments operation
 */
export interface GetCommentsResult {
  comments: Comment[];
  hasMore: boolean;
  nextCursor: string | null;
  totalCount: number;
}

/**
 * Comment service interface for dependency injection
 */
export interface ICommentService {
  /**
   * Create a comment on a post
   */
  createComment(
    postId: string,
    content: string
  ): Promise<AsyncState<CreateCommentResult>>;

  /**
   * Get comments for a post with pagination
   */
  getComments(
    postId: string,
    limit?: number,
    cursor?: string
  ): Promise<AsyncState<GetCommentsResult>>;

  /**
   * Delete a comment
   */
  deleteComment(commentId: string): Promise<AsyncState<boolean>>;
}
