/**
 * Comment Repository Interface
 *
 * Domain interface for comment data access.
 * Adapter implementations handle the translation from external services.
 */

import type { Result } from '../../shared/types/result';
import type { PaginatedResult } from '../../shared/types/pagination';

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface ICommentRepository {
  getCommentsByPost(
    postId: string,
    limit: number,
    cursor?: string
  ): Promise<Result<PaginatedResult<Comment>, Error>>;
}
