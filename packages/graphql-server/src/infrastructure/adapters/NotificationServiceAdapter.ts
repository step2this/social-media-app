/**
 * NotificationServiceAdapter
 *
 * Adapts external notification service to domain repository interface.
 * Transforms DAL's single-parameter method call to domain interface.
 *
 * Advanced TypeScript Pattern: API Signature Transformation & Interface Segregation
 * Maps (userId, limit, cursor) → ({ userId, limit, cursor })
 * Depends on interface, not concrete class - enables clean DI
 */

import type { INotificationRepository, Notification } from '../../domain/repositories/INotificationRepository.js';
import type { Notification as DalNotification } from '@social-media-app/shared';
import type { Result, PaginatedResult } from '../../shared/types/index.js';

/**
 * Minimal interface for notification service dependencies
 * Interface Segregation Principle: Adapter only depends on what it needs
 */
export interface INotificationService {
  getNotifications(request: {
    userId: string;
    limit: number;
    cursor?: string;
  }): Promise<{
    readonly notifications: readonly DalNotification[];
    readonly hasMore: boolean;
    readonly nextCursor: string | null;
    readonly totalCount: number;
    readonly unreadCount: number;
  }>;

  getUnreadCount(userId: string): Promise<number>;
}

/**
 * Transforms DAL notification to domain notification
 * Maps status field to read boolean and extracts only domain-required fields
 */
function toDomainNotification(dalNotification: DalNotification): Notification {
  return {
    id: dalNotification.id,
    userId: dalNotification.userId,
    type: mapNotificationType(dalNotification.type),
    read: dalNotification.status === 'read',
    createdAt: dalNotification.createdAt,
    actorId: dalNotification.actor?.userId,
    postId: dalNotification.target?.id,
  };
}

/**
 * Maps DAL notification types to domain notification types
 */
function mapNotificationType(dalType: DalNotification['type']): Notification['type'] {
  // Map DAL types to domain types (only LIKE, COMMENT, FOLLOW)
  switch (dalType) {
    case 'like':
      return 'LIKE';
    case 'comment':
    case 'reply':
    case 'mention':
      return 'COMMENT';
    case 'follow':
      return 'FOLLOW';
    default:
      // Default to FOLLOW for other types
      return 'FOLLOW';
  }
}

export class NotificationServiceAdapter implements INotificationRepository {
  constructor(private readonly notificationService: INotificationService) {}

  async getNotifications(
    userId: string,
    limit: number,
    cursor?: string
  ): Promise<Result<PaginatedResult<Notification>, Error>> {
    try {
      // DAL expects a single request object parameter
      const result = await this.notificationService.getNotifications({
        userId,
        limit,
        cursor,
      });

      // Transform DAL notifications to domain notifications
      const domainNotifications = result.notifications.map(toDomainNotification);

      return {
        success: true,
        data: {
          items: domainNotifications,
          hasMore: result.hasMore,
          cursor: result.nextCursor ?? undefined, // Convert null to undefined
        },
      };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async getUnreadCount(userId: string): Promise<Result<number, Error>> {
    try {
      const count = await this.notificationService.getUnreadCount(userId);
      return { success: true, data: count };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }
}
