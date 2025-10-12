import { z } from 'zod';
import {
  UUIDField,
  URLField,
  CountField,
  PaginationResponseSchema
} from './base.schema.js';

/**
 * Timestamp field validator with timezone offset support
 * Extends base TimestampField to accept ISO 8601 format with or without timezone offset
 *
 * @example
 * // Valid timestamps:
 * "2024-01-15T10:30:00Z"
 * "2024-01-15T10:30:00.123Z"
 * "2024-01-15T10:30:00+05:30"
 */
const TimestampField = z.string().datetime({ offset: true });

/**
 * Notification type enumeration
 * Defines all possible types of notifications in the system
 *
 * @example
 * // Social interaction types:
 * 'like' - User liked your post
 * 'comment' - User commented on your post
 * 'follow' - User followed you
 * 'mention' - User mentioned you in a post or comment
 * 'reply' - User replied to your comment
 * 'repost' - User reposted your content
 * 'quote' - User quoted your post
 *
 * // System types:
 * 'system' - System-generated notifications
 * 'announcement' - Platform announcements
 * 'achievement' - User achievement unlocked
 */
export const NotificationTypeSchema = z.enum([
  'like',
  'comment',
  'follow',
  'mention',
  'reply',
  'repost',
  'quote',
  'system',
  'announcement',
  'achievement'
]);

/**
 * Group type enumeration (extends notification types with 'mixed')
 * Used for notification groups that may contain multiple types
 */
export const NotificationGroupTypeSchema = z.enum([
  'like',
  'comment',
  'follow',
  'mention',
  'reply',
  'repost',
  'quote',
  'system',
  'announcement',
  'achievement',
  'mixed'
]);

/**
 * Notification status enumeration
 * Tracks the read/unread/archived state of a notification
 */
export const NotificationStatusSchema = z.enum([
  'unread',
  'read',
  'archived',
  'deleted'
]);

/**
 * Notification priority levels
 * Used to determine display urgency and styling
 */
export const NotificationPrioritySchema = z.enum([
  'low',
  'normal',
  'high',
  'urgent'
]);

/**
 * Delivery channels for notifications
 * Defines which platforms/methods can receive notifications
 */
export const NotificationDeliveryChannelSchema = z.enum([
  'in-app',
  'email',
  'push',
  'sms'
]);

/**
 * Notification actor schema
 * Represents the user who triggered the notification
 *
 * @example
 * {
 *   userId: "actor-uuid",
 *   handle: "johndoe",
 *   displayName: "John Doe",
 *   avatarUrl: "https://example.com/avatars/johndoe.jpg"
 * }
 */
export const NotificationActorSchema = z.object({
  userId: UUIDField,
  handle: z.string().min(1, 'Handle cannot be empty'),
  displayName: z.string().max(100, 'Display name must not exceed 100 characters').optional(),
  avatarUrl: URLField.optional()
});

/**
 * Notification target schema
 * Represents the entity being acted upon (post, comment, user, etc.)
 *
 * @example
 * {
 *   type: "post",
 *   id: "post-uuid",
 *   url: "https://example.com/posts/post-uuid",
 *   preview: "Check out this amazing sunset photo..."
 * }
 */
export const NotificationTargetSchema = z.object({
  type: z.enum(['post', 'comment', 'user']),
  id: UUIDField,
  url: URLField.optional(),
  preview: z.string().optional()
});

/**
 * Flexible metadata schema for notification-specific data
 * Accepts any valid JSON structure with common optional fields
 */
export const NotificationMetadataSchema = z.record(z.unknown()).optional();

/**
 * Notification badge schema
 * Controls badge display on UI elements
 */
export const NotificationBadgeSchema = z.object({
  count: CountField,
  displayCount: z.string(),
  visible: z.boolean().default(true),
  color: z.string().optional(),
  position: z.string().optional()
});

/**
 * Notification sound settings
 * Controls audio notifications
 */
export const NotificationSoundSchema = z.object({
  enabled: z.boolean().default(true),
  soundFile: z.string().default('default'),
  volume: z.number().min(0).max(1).default(1.0),
  soundPack: z.string().optional(),
  vibrationPattern: z.array(z.number()).optional()
});

/**
 * Title field validator
 * Notification titles must be 1-100 characters
 */
export const NotificationTitleField = z.string()
  .min(1, 'Title cannot be empty')
  .max(100, 'Title must not exceed 100 characters')
  .trim();

/**
 * Message field validator
 * Notification messages must be 1-500 characters
 */
export const NotificationMessageField = z.string()
  .min(1, 'Message cannot be empty')
  .max(500, 'Message must not exceed 500 characters')
  .trim();

/**
 * Time format validator for quiet hours (HH:MM)
 */
export const TimeFormatField = z.string().regex(
  /^([01]\d|2[0-3]):([0-5]\d)$/,
  'Invalid time format. Use HH:MM (24-hour format)'
);

/**
 * Core notification entity schema
 * Represents a single notification with all metadata and delivery settings
 *
 * @example
 * {
 *   id: "123e4567-e89b-12d3-a456-426614174000",
 *   userId: "user-uuid",
 *   type: "like",
 *   status: "unread",
 *   title: "New like on your post",
 *   message: "John Doe liked your photo",
 *   priority: "normal",
 *   actor: {
 *     userId: "actor-uuid",
 *     handle: "johndoe",
 *     displayName: "John Doe",
 *     avatarUrl: "https://example.com/avatar.jpg"
 *   },
 *   target: {
 *     type: "post",
 *     id: "post-uuid",
 *     url: "https://example.com/posts/123",
 *     preview: "Beautiful sunset photo..."
 *   },
 *   deliveryChannels: ["in-app", "push"],
 *   soundEnabled: true,
 *   vibrationEnabled: true,
 *   createdAt: "2024-01-15T10:30:00Z",
 *   updatedAt: "2024-01-15T10:30:00Z"
 * }
 */
export const NotificationSchema = z.object({
  id: UUIDField,
  userId: UUIDField,
  type: NotificationTypeSchema,
  status: NotificationStatusSchema.default('unread'),
  title: NotificationTitleField,
  message: NotificationMessageField,
  priority: NotificationPrioritySchema.default('normal'),
  actor: NotificationActorSchema.optional(),
  target: NotificationTargetSchema.optional(),
  metadata: NotificationMetadataSchema,
  deliveryChannels: z.array(NotificationDeliveryChannelSchema).default(['in-app']),
  soundEnabled: z.boolean().default(true),
  vibrationEnabled: z.boolean().default(true),
  groupId: z.string().trim().optional(),
  expiresAt: TimestampField.optional(),
  scheduledFor: TimestampField.optional(),
  readAt: TimestampField.nullable().optional(),
  createdAt: TimestampField,
  updatedAt: TimestampField
});

/**
 * Notification group schema
 * Represents grouped notifications (e.g., "5 people liked your post")
 */
export const NotificationGroupSchema = z.object({
  groupId: z.string(),
  type: NotificationGroupTypeSchema,
  count: CountField.default(1),
  latestNotificationId: UUIDField,
  actors: z.array(NotificationActorSchema).optional(),
  metadata: NotificationMetadataSchema,
  createdAt: TimestampField,
  updatedAt: TimestampField
});

/**
 * Request schema: Create a new notification
 */
export const CreateNotificationRequestSchema = z.object({
  userId: UUIDField,
  type: NotificationTypeSchema,
  title: NotificationTitleField,
  message: NotificationMessageField,
  priority: NotificationPrioritySchema.optional(),
  actor: NotificationActorSchema.optional(),
  target: NotificationTargetSchema.optional(),
  metadata: NotificationMetadataSchema,
  deliveryChannels: z.array(NotificationDeliveryChannelSchema).optional(),
  soundEnabled: z.boolean().optional(),
  vibrationEnabled: z.boolean().optional(),
  groupId: z.string().optional(),
  expiresAt: TimestampField.optional()
});

/**
 * Request schema: Update notification properties
 */
export const UpdateNotificationRequestSchema = z.object({
  status: NotificationStatusSchema.optional(),
  priority: NotificationPrioritySchema.optional(),
  soundEnabled: z.boolean().optional(),
  vibrationEnabled: z.boolean().optional(),
  deliveryChannels: z.array(NotificationDeliveryChannelSchema).optional(),
  readAt: TimestampField.optional()
}).partial();

/**
 * Request schema: Get notifications with filters and pagination
 */
export const GetNotificationsRequestSchema = z.object({
  userId: UUIDField,
  status: NotificationStatusSchema.optional(),
  type: NotificationTypeSchema.optional(),
  types: z.array(NotificationTypeSchema).optional(),
  priority: NotificationPrioritySchema.optional(),
  startDate: TimestampField.optional(),
  endDate: TimestampField.optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.number().int().positive().max(100).default(20),
  cursor: z.string().optional()
});

/**
 * Request schema: Mark notification(s) as read
 * Supports both single and bulk operations
 *
 * @example
 * // Single notification:
 * { notificationId: "123e4567-e89b-12d3-a456-426614174000" }
 *
 * // Multiple notifications:
 * { notificationIds: ["uuid1", "uuid2", "uuid3"] }
 */
export const MarkAsReadRequestSchema = z.object({
  notificationId: UUIDField.optional(),
  notificationIds: z.array(UUIDField).min(1, 'At least one notification ID is required').optional()
}).refine(
  (data) => data.notificationId || data.notificationIds,
  'Either notificationId or notificationIds must be provided'
);

/**
 * Request schema: Mark all notifications as read
 * Can be filtered by type or date
 */
export const MarkAllAsReadRequestSchema = z.object({
  userId: UUIDField,
  type: NotificationTypeSchema.optional(),
  beforeDate: TimestampField.optional()
});

/**
 * Request schema: Delete notification(s)
 * Supports both single and bulk operations
 *
 * @example
 * // Single notification:
 * { notificationId: "123e4567-e89b-12d3-a456-426614174000" }
 *
 * // Multiple notifications:
 * { notificationIds: ["uuid1", "uuid2", "uuid3"] }
 */
export const DeleteNotificationRequestSchema = z.object({
  notificationId: UUIDField.optional(),
  notificationIds: z.array(UUIDField).min(1, 'At least one notification ID is required').optional()
}).refine(
  (data) => data.notificationId || data.notificationIds,
  'Either notificationId or notificationIds must be provided'
);

/**
 * Notification preference schema
 * Per-type notification delivery preferences
 *
 * @example
 * {
 *   enabled: true,    // Master switch for this notification type
 *   email: true,      // Send email notifications
 *   push: true,       // Send push notifications
 *   inApp: true       // Show in-app notifications
 * }
 */
export const NotificationPreferenceItemSchema = z.object({
  enabled: z.boolean().default(true),
  email: z.boolean().default(true),
  push: z.boolean().default(true),
  inApp: z.boolean().default(true)
});

/**
 * Partial notification preference schema (for updates)
 * Each field is optional but applies defaults when missing
 * Used internally for preference updates where partial data is acceptable
 */
const PartialNotificationPreferenceItemSchema = z.object({
  enabled: z.boolean().optional(),
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  inApp: z.boolean().optional()
}).transform((data) => ({
  enabled: data.enabled ?? true,
  email: data.email ?? true,
  push: data.push ?? true,
  inApp: data.inApp ?? true
}));

/**
 * Notification preferences for all notification types
 * Uses passthrough to allow unknown notification type preferences
 *
 * @example
 * {
 *   likes: { enabled: true, email: false, push: true, inApp: true },
 *   comments: { enabled: true, email: true, push: true, inApp: true },
 *   follows: { enabled: true, email: true, push: false, inApp: true },
 *   mentions: { enabled: true, email: true, push: true, inApp: true }
 * }
 */
export const NotificationPreferencesSchema = z.object({
  likes: PartialNotificationPreferenceItemSchema.optional(),
  comments: PartialNotificationPreferenceItemSchema.optional(),
  follows: PartialNotificationPreferenceItemSchema.optional(),
  mentions: PartialNotificationPreferenceItemSchema.optional(),
  system: PartialNotificationPreferenceItemSchema.optional(),
  announcements: PartialNotificationPreferenceItemSchema.optional()
}).passthrough();

/**
 * Device-specific notification preferences
 */
export const DeviceNotificationPreferencesSchema = z.object({
  pushEnabled: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  vibrationEnabled: z.boolean().optional()
}).partial();

/**
 * User notification settings schema
 * Global notification preferences and quiet hours
 *
 * @example
 * {
 *   userId: "user-uuid",
 *   emailEnabled: true,
 *   pushEnabled: true,
 *   inAppEnabled: true,
 *   soundEnabled: true,
 *   vibrationEnabled: true,
 *   quietHoursStart: "22:00",
 *   quietHoursEnd: "08:00",
 *   preferences: {
 *     likes: { enabled: true, email: false, push: true, inApp: true },
 *     comments: { enabled: true, email: true, push: true, inApp: true }
 *   },
 *   devices: {
 *     mobile: { pushEnabled: true, soundEnabled: false },
 *     desktop: { pushEnabled: true, soundEnabled: true }
 *   },
 *   createdAt: "2024-01-15T10:30:00Z",
 *   updatedAt: "2024-01-15T10:30:00Z"
 * }
 */
export const NotificationSettingsSchema = z.object({
  userId: UUIDField,
  emailEnabled: z.boolean().default(true),
  pushEnabled: z.boolean().default(true),
  inAppEnabled: z.boolean().default(true),
  soundEnabled: z.boolean().default(true),
  vibrationEnabled: z.boolean().default(true),
  quietHoursStart: TimeFormatField.optional(),
  quietHoursEnd: TimeFormatField.optional(),
  preferences: NotificationPreferencesSchema.optional(),
  devices: z.object({
    mobile: DeviceNotificationPreferencesSchema.optional(),
    desktop: DeviceNotificationPreferencesSchema.optional()
  }).optional(),
  createdAt: TimestampField,
  updatedAt: TimestampField
});

/**
 * Request schema: Update notification settings
 */
export const UpdateNotificationSettingsRequestSchema = z.object({
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  vibrationEnabled: z.boolean().optional(),
  quietHoursStart: TimeFormatField.optional(),
  quietHoursEnd: TimeFormatField.optional(),
  preferences: NotificationPreferencesSchema.optional()
}).partial();

/**
 * Batch operation schema
 * Supports bulk operations on multiple notifications
 *
 * @example
 * {
 *   operation: "mark-read",
 *   notificationIds: ["uuid1", "uuid2", "uuid3"]
 * }
 */
export const BatchNotificationOperationSchema = z.object({
  operation: z.enum(['mark-read', 'delete', 'archive']),
  notificationIds: z.array(UUIDField).min(1, 'At least one notification ID is required')
});

/**
 * Response schema: Single notification
 * Returns either the notification data or an error
 *
 * @example
 * // Success:
 * { notification: { id: "...", userId: "...", ... } }
 *
 * // Error:
 * {
 *   error: "Notification not found",
 *   errorCode: "NOTIFICATION_NOT_FOUND",
 *   details: { notificationId: "..." }
 * }
 */
export const NotificationResponseSchema = z.union([
  z.object({
    notification: NotificationSchema
  }),
  z.object({
    error: z.string(),
    errorCode: z.string(),
    details: z.record(z.unknown()).optional()
  })
]);

/**
 * Summary statistics schema for notification lists
 */
export const NotificationSummarySchema = z.object({
  byType: z.record(z.number()).optional(),
  oldestUnread: TimestampField.optional(),
  newestUnread: TimestampField.optional()
}).optional();

/**
 * Response schema: List of notifications with pagination
 * Includes summary statistics for the notification list
 *
 * @example
 * {
 *   notifications: [...],
 *   totalCount: 150,
 *   unreadCount: 12,
 *   hasMore: true,
 *   nextCursor: "cursor-string",
 *   summary: {
 *     byType: { like: 5, comment: 3, follow: 2 },
 *     oldestUnread: "2024-01-10T10:30:00Z",
 *     newestUnread: "2024-01-15T10:30:00Z"
 *   }
 * }
 */
export const NotificationsListResponseSchema = PaginationResponseSchema.extend({
  notifications: z.array(NotificationSchema),
  totalCount: CountField,
  unreadCount: CountField,
  summary: NotificationSummarySchema
});

/**
 * Response schema: Mark notification as read
 * Returns the updated notification
 */
export const MarkNotificationReadResponseSchema = z.object({
  notification: NotificationSchema.optional()
});

/**
 * Response schema: Mark all notifications as read
 * Returns count of updated notifications
 */
export const MarkAllNotificationsReadResponseSchema = z.object({
  updatedCount: CountField
});

/**
 * Response schema: Get unread count
 * Returns count of unread notifications
 */
export const GetUnreadCountResponseSchema = z.object({
  count: CountField
});

/**
 * Response schema: Delete notification
 * Returns success status and deleted count
 */
export const DeleteNotificationResponseSchema = z.object({
  success: z.boolean(),
  deletedCount: CountField.optional()
});

/**
 * Response schema: Get notifications (alias for NotificationsListResponseSchema)
 */
export const GetNotificationsResponseSchema = NotificationsListResponseSchema;

/**
 * Type exports
 * TypeScript types inferred from Zod schemas
 */

// Enum types
export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export type NotificationGroupType = z.infer<typeof NotificationGroupTypeSchema>;
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;
export type NotificationPriority = z.infer<typeof NotificationPrioritySchema>;
export type NotificationDeliveryChannel = z.infer<typeof NotificationDeliveryChannelSchema>;

// Component types
export type NotificationActor = z.infer<typeof NotificationActorSchema>;
export type NotificationTarget = z.infer<typeof NotificationTargetSchema>;
export type NotificationMetadata = z.infer<typeof NotificationMetadataSchema>;
export type NotificationBadge = z.infer<typeof NotificationBadgeSchema>;
export type NotificationSound = z.infer<typeof NotificationSoundSchema>;

// Entity types
export type Notification = z.infer<typeof NotificationSchema>;
export type NotificationGroup = z.infer<typeof NotificationGroupSchema>;

// Request types
export type CreateNotificationRequest = z.infer<typeof CreateNotificationRequestSchema>;
export type UpdateNotificationRequest = z.infer<typeof UpdateNotificationRequestSchema>;
export type GetNotificationsRequest = z.infer<typeof GetNotificationsRequestSchema>;
export type MarkAsReadRequest = z.infer<typeof MarkAsReadRequestSchema>;
export type MarkAllAsReadRequest = z.infer<typeof MarkAllAsReadRequestSchema>;
export type DeleteNotificationRequest = z.infer<typeof DeleteNotificationRequestSchema>;
export type BatchNotificationOperation = z.infer<typeof BatchNotificationOperationSchema>;

// Preference types
export type NotificationPreferenceItem = z.infer<typeof NotificationPreferenceItemSchema>;
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;
export type DeviceNotificationPreferences = z.infer<typeof DeviceNotificationPreferencesSchema>;
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;
export type UpdateNotificationSettingsRequest = z.infer<typeof UpdateNotificationSettingsRequestSchema>;

// Response types
export type NotificationResponse = z.infer<typeof NotificationResponseSchema>;
export type NotificationSummary = z.infer<typeof NotificationSummarySchema>;
export type NotificationsListResponse = z.infer<typeof NotificationsListResponseSchema>;
export type MarkNotificationReadResponse = z.infer<typeof MarkNotificationReadResponseSchema>;
export type MarkAllNotificationsReadResponse = z.infer<typeof MarkAllNotificationsReadResponseSchema>;
export type GetUnreadCountResponse = z.infer<typeof GetUnreadCountResponseSchema>;
export type DeleteNotificationResponse = z.infer<typeof DeleteNotificationResponseSchema>;
export type GetNotificationsResponse = z.infer<typeof GetNotificationsResponseSchema>;
