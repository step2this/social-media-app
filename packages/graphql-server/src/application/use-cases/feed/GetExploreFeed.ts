/**
 * GetExploreFeed Use Case
 *
 * Retrieves the explore feed for discovery.
 * Supports both anonymous and authenticated users (with optional personalization).
 */

import type { IFeedRepository } from '../../../domain/repositories/IFeedRepository.js';
import type { Post } from '../../../domain/repositories/IPostRepository.js';
import { AsyncResult, UserId, Connection, PaginationArgs } from '../../../shared/types/index.js';
import { logger } from '../../../infrastructure/logger.js';

export interface GetExploreFeedInput {
  pagination: PaginationArgs;
  viewerId?: UserId;
}

export class GetExploreFeed {
  constructor(private readonly feedRepository: IFeedRepository) {}

  async execute(input: GetExploreFeedInput): AsyncResult<Connection<Post>> {
    logger.debug({
      pagination: input.pagination,
      viewerId: input.viewerId
    }, '[GetExploreFeed] UseCase: Executing with input');

    if (!input.pagination.first || input.pagination.first <= 0) {
      logger.warn('[GetExploreFeed] UseCase: Invalid pagination - first must be > 0');
      return {
        success: false,
        error: new Error('Pagination first must be greater than 0'),
      };
    }

    const repositoryResult = await this.feedRepository.getExploreFeed(input.pagination, input.viewerId);

    if (!repositoryResult.success) {
      logger.error('[GetExploreFeed] UseCase: Repository returned error');
      return repositoryResult;
    }

    const edgeCount = repositoryResult.data.edges.length;
    const hasNextPage = repositoryResult.data.pageInfo.hasNextPage;

    logger.debug({
      edgeCount,
      hasNextPage,
      firstPostId: edgeCount > 0 ? repositoryResult.data.edges[0].node.id : null,
      lastPostId: edgeCount > 0 ? repositoryResult.data.edges[edgeCount - 1].node.id : null
    }, '[GetExploreFeed] UseCase: Returning successful result');

    return {
      success: true,
      data: repositoryResult.data,
    };
  }
}
