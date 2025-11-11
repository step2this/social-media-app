/**
 * NotificationTypeAdapter
 *
 * Type-safe adapter for transforming Notification types between DAL and GraphQL layers.
 * Eliminates need for @ts-ignore comments by providing explicit type transformations.
 *
 * Key Transformations:
 * - Handles optional field conversions (undefined → null for GraphQL)
 * - Casts string types to GraphQL enums (type, status)
 * - Ensures type safety between DAL and GraphQL Notification structures
 *
 * @example
 * ```typescript
 * const dalNotification = await service.markAsRead(notificationId, userId);
 * const graphqlNotification = adaptNotificationToGraphQL(dalNotification);
 * return graphqlNotification; // ✅ Type-safe!
 * ```
 */

import type { Notification as DalNotification } from '@social-media-app/shared';
import type {
  Notification as GraphQLNotification,
  NotificationType,
  NotificationStatus
} from '../../../schema/generated/types.js';

/**
 * Transform DAL Notification to GraphQL Notification
 *
 * Maps domain notification to GraphQL-compatible structure, handling optional fields
 * and enum type conversions.
 *
 * @param dal - Notification from DAL layer
 * @returns GraphQL-compatible Notification
 */
export function adaptNotificationToGraphQL(
  dal: DalNotification
): GraphQLNotification {
  return {
    id: dal.id,
    userId: dal.userId,
    type: dal.type.toUpperCase() as NotificationType, // Cast string to enum
    title: dal.title,
    message: dal.message,
    status: dal.status.toUpperCase() as NotificationStatus, // Cast string to enum
    actor: dal.actor ?? null,
    target: dal.target ?? null,
    createdAt: dal.createdAt,
    readAt: dal.readAt ?? null,
  };
}
