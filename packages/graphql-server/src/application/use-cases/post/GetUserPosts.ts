/**
 * GetUserPosts Use Case
 *
 * Retrieves posts for a specific user (paginated).
 * This is a public operation - no authentication required.
 */

import type { IPostRepository, Post } from '../../../domain/repositories/IPostRepository.js';
import { AsyncResult, UserId, Connection, PaginationArgs } from '../../../shared/types/index.js';

export interface GetUserPostsInput {
  userId: UserId;
  pagination: PaginationArgs;
}

export class GetUserPosts {
  constructor(private readonly postRepository: IPostRepository) {}

  async execute(input: GetUserPostsInput): AsyncResult<Connection<Post>> {
    if (!input.userId) {
      return {
        success: false,
        error: new Error('User ID is required'),
      };
    }

    if (!input.pagination.first || input.pagination.first <= 0) {
      return {
        success: false,
        error: new Error('Pagination first must be greater than 0'),
      };
    }

    const repositoryResult = await this.postRepository.findByUser(input.userId, input.pagination);

    if (!repositoryResult.success) {
      return repositoryResult;
    }

    return {
      success: true,
      data: repositoryResult.data,
    };
  }
}
