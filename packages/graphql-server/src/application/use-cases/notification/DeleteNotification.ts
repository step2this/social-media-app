/**
 * DeleteNotification Use Case
 */

import { AsyncResult, UserId } from '../../../shared/types/index.js';

export interface DeleteNotificationInput {
  userId: UserId;
  notificationId: string;
}

export interface DeleteNotificationOutput {
  success: boolean;
}

export interface DeleteNotificationServices {
  notificationService: {
    deleteNotification(params: { userId: string; notificationId: string }): Promise<void>;
  };
}

export class DeleteNotification {
  constructor(private readonly services: DeleteNotificationServices) {}

  async execute(input: DeleteNotificationInput): AsyncResult<DeleteNotificationOutput> {
    try {
      await this.services.notificationService.deleteNotification({
        userId: input.userId,
        notificationId: input.notificationId,
      });

      return {
        success: true,
        data: { success: true },
      };
    } catch (error) {
      // Idempotent - return success even if not found
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        return {
          success: false,
          error,
        };
      }
      return {
        success: true,
        data: { success: true },
      };
    }
  }
}
