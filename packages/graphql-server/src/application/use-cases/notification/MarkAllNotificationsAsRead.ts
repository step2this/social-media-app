/**
 * MarkAllNotificationsAsRead Use Case
 */

import { AsyncResult, UserId } from '../../../shared/types/index.js';

export interface MarkAllNotificationsAsReadInput {
  userId: UserId;
}

export interface MarkAllNotificationsAsReadOutput {
  updatedCount: number;
}

export interface MarkAllNotificationsAsReadServices {
  notificationService: {
    markAllAsRead(params: { userId: string }): Promise<{ updatedCount: number }>;
  };
}

export class MarkAllNotificationsAsRead {
  constructor(private readonly services: MarkAllNotificationsAsReadServices) {}

  async execute(input: MarkAllNotificationsAsReadInput): AsyncResult<MarkAllNotificationsAsReadOutput> {
    try {
      const result = await this.services.notificationService.markAllAsRead({
        userId: input.userId,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to mark all notifications as read'),
      };
    }
  }
}
