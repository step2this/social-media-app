/**
 * GetExploreFeed Use Case
 *
 * Retrieves the explore feed for discovery.
 * Supports both anonymous and authenticated users (with optional personalization).
 */

import type { IFeedRepository } from '../../../domain/repositories/IFeedRepository.js';
import type { Post } from '../../../domain/repositories/IPostRepository.js';
import { AsyncResult, UserId, Connection, PaginationArgs } from '../../../shared/types/index.js';

export interface GetExploreFeedInput {
  pagination: PaginationArgs;
  viewerId?: UserId;
}

export class GetExploreFeed {
  constructor(private readonly feedRepository: IFeedRepository) {}

  async execute(input: GetExploreFeedInput): AsyncResult<Connection<Post>> {
    if (!input.pagination.first || input.pagination.first <= 0) {
      return {
        success: false,
        error: new Error('Pagination first must be greater than 0'),
      };
    }

    const repositoryResult = await this.feedRepository.getExploreFeed(input.pagination, input.viewerId);

    if (!repositoryResult.success) {
      return repositoryResult;
    }

    return {
      success: true,
      data: repositoryResult.data,
    };
  }
}
