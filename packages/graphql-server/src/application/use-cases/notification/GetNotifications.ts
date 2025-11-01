/**
 * GetNotifications Use Case
 *
 * Retrieves paginated notifications for a user.
 * Delegates to repository implementation for data access.
 */

import type { INotificationRepository, Notification } from '../../../domain/repositories/INotificationRepository';
import type { Result } from '../../../shared/types/result';
import type { PaginatedResult } from '../../../shared/types/pagination';

export class GetNotifications {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  async execute(
    userId: string,
    limit: number,
    cursor?: string
  ): Promise<Result<PaginatedResult<Notification>, Error>> {
    return this.notificationRepository.getNotifications(userId, limit, cursor);
  }
}
