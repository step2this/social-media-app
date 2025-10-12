/**
 * Notification mapping utilities
 * Provides pure functional mappers for converting NotificationEntity to Notification domain objects
 *
 * @module notification-mappers
 */

import type { Notification } from '@social-media-app/shared';

/**
 * NotificationEntity for DynamoDB storage
 *
 * **DynamoDB Key Design:**
 * - **Primary Keys**: User-centric partition for efficient user notification queries
 * - **GSI1**: Notification-by-ID lookup for single notification operations
 * - **GSI2**: Sparse index for unread notifications only (performance optimization)
 *
 * **Access Patterns:**
 * 1. Get notifications for a user (ordered by time):
 *    - Query: `PK = USER#<userId>`, `SK begins_with NOTIFICATION#`
 *    - Use: Primary table query
 * 2. Get single notification by ID:
 *    - Query: `GSI1PK = NOTIFICATION#<id>`
 *    - Use: GSI1 for ownership verification
 * 3. Get unread notifications count (efficient):
 *    - Query: `GSI2PK = UNREAD#USER#<userId>`
 *    - Use: Sparse GSI2 (only contains unread notifications)
 *
 * **Sparse Index Pattern:**
 * GSI2 keys (GSI2PK, GSI2SK) are only present when `isRead = false`.
 * When marking as read, these keys are removed via `REMOVE GSI2PK, GSI2SK`.
 * This keeps the index small and queries fast.
 *
 * **TTL Pattern:**
 * Notifications auto-delete after 30 days via DynamoDB TTL on the `ttl` field.
 */
export interface NotificationEntity {
  // Primary keys for user's notifications
  readonly PK: string; // USER#<userId>
  readonly SK: string; // NOTIFICATION#<timestamp>#<id>

  // GSI1 - Notification lookup by ID
  readonly GSI1PK: string; // NOTIFICATION#<id>
  readonly GSI1SK: string; // USER#<userId>

  // GSI2 - Sparse index for unread notifications
  readonly GSI2PK?: string; // UNREAD#USER#<userId> (only when isRead=false)
  readonly GSI2SK?: string; // NOTIFICATION#<timestamp>#<id> (only when isRead=false)

  // Notification fields from schema
  readonly id: string;
  readonly userId: string;
  readonly type: string;
  readonly status: string;
  readonly title: string;
  readonly message: string;
  readonly priority: string;
  readonly actor?: {
    readonly userId: string;
    readonly handle: string;
    readonly displayName?: string;
    readonly avatarUrl?: string;
  };
  readonly target?: {
    readonly type: string;
    readonly id: string;
    readonly url?: string;
    readonly preview?: string;
  };
  readonly metadata?: Record<string, unknown>;
  readonly deliveryChannels: readonly string[];
  readonly soundEnabled: boolean;
  readonly vibrationEnabled: boolean;
  readonly groupId?: string;
  readonly expiresAt?: string;
  readonly scheduledFor?: string;
  readonly readAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;

  // DynamoDB metadata
  readonly entityType: 'NOTIFICATION';
  readonly ttl: number; // Unix timestamp for 30-day auto-deletion
  readonly isRead: boolean; // Controls sparse GSI2 index
}

/**
 * Maps NotificationEntity to Notification domain object
 * Pure function - extracts domain fields and removes DynamoDB infrastructure keys
 *
 * **Transformation:**
 * - Strips DynamoDB keys (PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK)
 * - Strips DynamoDB metadata (entityType, ttl, isRead)
 * - Preserves all domain fields from the shared schema
 *
 * @param entity - NotificationEntity from DynamoDB
 * @returns Notification domain object conforming to shared schema
 *
 * @example
 * ```typescript
 * const entity: NotificationEntity = {
 *   PK: 'USER#123',
 *   SK: 'NOTIFICATION#2024-01-15T10:00:00Z#abc-123',
 *   GSI1PK: 'NOTIFICATION#abc-123',
 *   GSI1SK: 'USER#123',
 *   id: 'abc-123',
 *   userId: '123',
 *   type: 'follow',
 *   status: 'unread',
 *   title: 'New follower',
 *   message: 'John started following you',
 *   priority: 'normal',
 *   deliveryChannels: ['in-app'],
 *   soundEnabled: true,
 *   vibrationEnabled: true,
 *   createdAt: '2024-01-15T10:00:00Z',
 *   updatedAt: '2024-01-15T10:00:00Z',
 *   entityType: 'NOTIFICATION',
 *   ttl: 1234567890,
 *   isRead: false
 * };
 *
 * const notification = mapEntityToNotification(entity);
 * // Returns: { id: 'abc-123', userId: '123', type: 'follow', ... }
 * // (without PK, SK, GSI keys, entityType, ttl, isRead)
 * ```
 */
export const mapEntityToNotification = (entity: NotificationEntity): Notification => ({
  id: entity.id,
  userId: entity.userId,
  type: entity.type as Notification['type'],
  status: entity.status as Notification['status'],
  title: entity.title,
  message: entity.message,
  priority: entity.priority as Notification['priority'],
  actor: entity.actor,
  target: entity.target as Notification['target'],
  metadata: entity.metadata,
  deliveryChannels: entity.deliveryChannels as Notification['deliveryChannels'],
  soundEnabled: entity.soundEnabled,
  vibrationEnabled: entity.vibrationEnabled,
  groupId: entity.groupId,
  expiresAt: entity.expiresAt,
  scheduledFor: entity.scheduledFor,
  readAt: entity.readAt,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt
});
