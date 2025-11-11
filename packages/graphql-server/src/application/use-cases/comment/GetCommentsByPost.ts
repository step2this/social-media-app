/**
 * GetCommentsByPost Use Case
 *
 * Retrieves paginated comments for a specific post.
 * Delegates to repository implementation for data access.
 */

import type { ICommentRepository, Comment } from '../../../domain/repositories/ICommentRepository.js';
import type { Result } from '../../../shared/types/result.js';
import type { PaginatedResult } from '../../../shared/types/pagination.js';

export class GetCommentsByPost {
  constructor(private readonly commentRepository: ICommentRepository) {}

  async execute(
    postId: string,
    limit: number,
    cursor?: string
  ): Promise<Result<PaginatedResult<Comment>, Error>> {
    return this.commentRepository.getCommentsByPost(postId, limit, cursor);
  }
}
