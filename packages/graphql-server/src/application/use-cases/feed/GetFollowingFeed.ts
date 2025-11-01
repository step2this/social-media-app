/**
 * GetFollowingFeed Use Case
 *
 * Retrieves the following feed for an authenticated user.
 * Shows posts from users they follow (paginated).
 */

import type { IFeedRepository } from '../../../domain/repositories/IFeedRepository.js';
import type { Post } from '../../../domain/repositories/IPostRepository.js';
import { AsyncResult, UserId, Connection, PaginationArgs } from '../../../shared/types/index.js';

export interface GetFollowingFeedInput {
  userId: UserId;
  pagination: PaginationArgs;
}

export class GetFollowingFeed {
  constructor(private readonly feedRepository: IFeedRepository) {}

  async execute(input: GetFollowingFeedInput): AsyncResult<Connection<Post>> {
    if (!input.userId) {
      return {
        success: false,
        error: new Error('User must be authenticated'),
      };
    }

    if (!input.pagination.first || input.pagination.first <= 0) {
      return {
        success: false,
        error: new Error('Pagination first must be greater than 0'),
      };
    }

    const repositoryResult = await this.feedRepository.getFollowingFeed(input.userId, input.pagination);

    if (!repositoryResult.success) {
      return repositoryResult;
    }

    return {
      success: true,
      data: repositoryResult.data,
    };
  }
}
