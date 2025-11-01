/**
 * NotificationServiceAdapter
 *
 * Adapts external notification service to domain repository interface.
 * Uses shared adapter helpers for DRY error handling and response mapping.
 */

import type {
  INotificationRepository,
  Notification,
} from '../../domain/repositories/INotificationRepository';
import type { INotificationService } from '@social-media-app/dal';
import type { PaginatedResult } from '../../shared/types/pagination';
import type { Result } from '../../shared/types/result';
import { adaptServiceCall, adaptPaginatedResponse } from './shared/AdapterHelpers';

export class NotificationServiceAdapter implements INotificationRepository {
  constructor(private readonly notificationService: INotificationService) {}

  async getNotifications(
    userId: string,
    limit: number,
    cursor?: string
  ): Promise<Result<PaginatedResult<Notification>, Error>> {
    return adaptServiceCall(async () => {
      const result = await this.notificationService.getNotifications(userId, limit, cursor);
      return adaptPaginatedResponse(result);
    });
  }

  async getUnreadCount(userId: string): Promise<Result<number, Error>> {
    return adaptServiceCall(() => this.notificationService.getUnreadCount(userId));
  }
}
