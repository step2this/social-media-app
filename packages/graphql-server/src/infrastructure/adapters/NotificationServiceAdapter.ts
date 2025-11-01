/**
 * NotificationServiceAdapter
 *
 * Adapts external notification service to domain repository interface.
 * Uses shared adapter helpers for DRY error handling and response mapping.
 */

import type { INotificationRepository } from '../../domain/repositories/INotificationRepository';
import type { INotificationService } from '@social-media-app/dal';
import { adaptServiceCall, adaptPaginatedResponse } from './shared/AdapterHelpers';

export class NotificationServiceAdapter implements INotificationRepository {
  constructor(private readonly notificationService: INotificationService) {}

  async getNotifications(userId: string, limit: number, cursor?: string) {
    return adaptServiceCall(async () => {
      const result = await this.notificationService.getNotifications(userId, limit, cursor);
      return adaptPaginatedResponse(result);
    });
  }

  async getUnreadCount(userId: string) {
    return adaptServiceCall(() => this.notificationService.getUnreadCount(userId));
  }
}
