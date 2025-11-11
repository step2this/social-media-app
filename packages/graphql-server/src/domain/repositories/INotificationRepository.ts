/**
 * Notification Repository Interface
 *
 * Domain interface for notification data access.
 * Adapter implementations handle the translation from external services.
 */

import type { Result } from '../../shared/types/result.js';
import type { PaginatedResult } from '../../shared/types/pagination.js';

export interface Notification {
  id: string;
  userId: string;
  type: 'LIKE' | 'COMMENT' | 'FOLLOW';
  read: boolean;
  createdAt: string;
  actorId?: string;
  postId?: string;
}

export interface INotificationRepository {
  getNotifications(
    userId: string,
    limit: number,
    cursor?: string
  ): Promise<Result<PaginatedResult<Notification>, Error>>;

  getUnreadCount(userId: string): Promise<Result<number, Error>>;
}
