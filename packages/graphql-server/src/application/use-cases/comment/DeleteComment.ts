/**
 * DeleteComment Use Case
 *
 * Deletes a comment (ownership verified by service).
 */

import { AsyncResult, UserId } from '../../../shared/types/index.js';

export interface DeleteCommentInput {
  commentId: string;
  userId: UserId;
}

export interface DeleteCommentOutput {
  success: boolean;
}

export interface DeleteCommentServices {
  commentService: {
    deleteComment(commentId: string, userId: string): Promise<boolean>;
  };
}

export class DeleteComment {
  constructor(private readonly services: DeleteCommentServices) {}

  async execute(input: DeleteCommentInput): AsyncResult<DeleteCommentOutput> {
    try {
      const success = await this.services.commentService.deleteComment(
        input.commentId,
        input.userId
      );

      if (!success) {
        return {
          success: false,
          error: new Error('Comment not found or you do not have permission to delete it'),
        };
      }

      return {
        success: true,
        data: { success: true },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to delete comment'),
      };
    }
  }
}
