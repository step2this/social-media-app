/**
 * GetUnreadNotificationsCount Use Case
 *
 * Retrieves the count of unread notifications for a user.
 * Delegates to repository implementation for data access.
 */

import type { INotificationRepository } from '../../../domain/repositories/INotificationRepository.js';
import type { Result } from '../../../shared/types/result.js';

export class GetUnreadNotificationsCount {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  async execute(userId: string): Promise<Result<number, Error>> {
    return this.notificationRepository.getUnreadCount(userId);
  }
}
