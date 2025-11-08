/**
 * MarkNotificationAsRead Use Case
 */

import { AsyncResult, UserId } from '../../../shared/types/index.js';

export interface MarkNotificationAsReadInput {
  userId: UserId;
  notificationId: string;
}

export interface MarkNotificationAsReadOutput {
  id: string;
  userId: string;
  type: string;
  status: string;
  createdAt: string;
  readAt: string | null;
}

export interface MarkNotificationAsReadServices {
  notificationService: {
    markAsRead(params: { userId: string; notificationId: string }): Promise<{
      notification: MarkNotificationAsReadOutput | null;
    }>;
  };
}

export class MarkNotificationAsRead {
  constructor(private readonly services: MarkNotificationAsReadServices) {}

  async execute(input: MarkNotificationAsReadInput): AsyncResult<MarkNotificationAsReadOutput> {
    try {
      const result = await this.services.notificationService.markAsRead({
        userId: input.userId,
        notificationId: input.notificationId,
      });

      if (!result.notification) {
        return {
          success: false,
          error: new Error('Notification not found'),
        };
      }

      return {
        success: true,
        data: result.notification,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Unauthorized')) {
          return { success: false, error };
        }
      }
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to mark notification as read'),
      };
    }
  }
}
