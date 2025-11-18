/**
 * CommentServiceAdapter
 *
 * Adapts external comment service to domain repository interface.
 * Uses shared adapter helpers for DRY error handling and response mapping.
 */

import type { ICommentRepository, Comment } from '../../domain/repositories/ICommentRepository.js';
import type { CommentService } from '@social-media-app/dal';
import { adaptServiceCall, adaptPaginatedResponse } from './shared/AdapterHelpers.js';
import type { Result } from '../../shared/types/result.js';
import type { PaginatedResult } from '../../shared/types/pagination.js';

export class CommentServiceAdapter implements ICommentRepository {
  constructor(private readonly commentService: CommentService) {}

  async getCommentsByPost(
    postId: string,
    limit: number,
    cursor?: string
  ): Promise<Result<PaginatedResult<Comment>, Error>> {
    return adaptServiceCall(async () => {
      const result = await this.commentService.getCommentsByPost(postId, limit, cursor);
      return adaptPaginatedResponse<any, Comment>(result);
    });
  }
}
