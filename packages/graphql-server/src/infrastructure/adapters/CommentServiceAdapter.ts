/**
 * CommentServiceAdapter
 *
 * Adapts external comment service to domain repository interface.
 * Uses shared adapter helpers for DRY error handling and response mapping.
 */

import type { ICommentRepository } from '../../domain/repositories/ICommentRepository';
import type { CommentService } from '@social-media-app/dal';
import { adaptServiceCall, adaptPaginatedResponse } from './shared/AdapterHelpers';

export class CommentServiceAdapter implements ICommentRepository {
  constructor(private readonly commentService: CommentService) {}

  async getCommentsByPost(postId: string, limit: number, cursor?: string) {
    return adaptServiceCall(async () => {
      const result = await this.commentService.getCommentsByPost(postId, limit, cursor);
      return adaptPaginatedResponse(result);
    });
  }
}
