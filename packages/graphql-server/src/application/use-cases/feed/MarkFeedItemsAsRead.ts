/**
 * MarkFeedItemsAsRead Use Case
 */

import { AsyncResult, UserId } from '../../../shared/types/index.js';

export interface MarkFeedItemsAsReadInput {
  userId: UserId;
  postIds: string[];
}

export interface MarkFeedItemsAsReadOutput {
  updatedCount: number;
}

export interface MarkFeedItemsAsReadServices {
  feedService: {
    markFeedItemsAsRead(params: { userId: string; postIds: string[] }): Promise<{ updatedCount: number }>;
  };
}

export class MarkFeedItemsAsRead {
  constructor(private readonly services: MarkFeedItemsAsReadServices) {}

  async execute(input: MarkFeedItemsAsReadInput): AsyncResult<MarkFeedItemsAsReadOutput> {
    try {
      const result = await this.services.feedService.markFeedItemsAsRead({
        userId: input.userId,
        postIds: input.postIds,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid UUID')) {
        return { success: false, error };
      }
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to mark feed items as read'),
      };
    }
  }
}
