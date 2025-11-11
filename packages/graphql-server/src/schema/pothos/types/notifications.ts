/**
 * Notifications Types - Pothos Implementation
 *
 * This file defines all notification-related GraphQL types using Pothos.
 *
 * Key Benefits:
 * - ✅ Type-safe: TypeScript types flow into GraphQL schema
 * - ✅ No type adapters: Schema matches DAL types exactly
 * - ✅ Autocomplete: Full IntelliSense when defining fields
 * - ✅ Refactoring: Rename a field = schema updates automatically
 */

import { builder } from '../builder.js';
import { PageInfoType } from './comments.js';

/**
 * NotificationType Enum
 *
 * Types of notifications that can be sent to users.
 */
export const NotificationTypeEnum = builder.enumType('NotificationType', {
  values: ['LIKE', 'COMMENT', 'FOLLOW', 'MENTION', 'SYSTEM'] as const,
});

/**
 * NotificationStatus Enum
 *
 * Status states for notifications.
 */
export const NotificationStatusEnum = builder.enumType('NotificationStatus', {
  values: ['UNREAD', 'READ', 'ARCHIVED'] as const,
});

/**
 * NotificationActor Type
 *
 * Information about the user who triggered the notification.
 */
export const NotificationActorType = builder.objectType('NotificationActor', {
  fields: (t) => ({
    userId: t.exposeID('userId', {
      description: 'ID of the user who triggered the notification',
    }),
    handle: t.exposeString('handle', {
      description: 'Handle of the user',
    }),
    displayName: t.exposeString('displayName', {
      nullable: true,
      description: 'Display name of the user',
    }),
    avatarUrl: t.exposeString('avatarUrl', {
      nullable: true,
      description: 'Avatar URL of the user',
    }),
  }),
});

/**
 * NotificationTarget Type
 *
 * Information about the target of the notification (e.g., a post, comment).
 */
export const NotificationTargetType = builder.objectType('NotificationTarget', {
  fields: (t) => ({
    type: t.exposeString('type', {
      description: 'Type of the target (e.g., "post", "comment")',
    }),
    id: t.exposeID('id', {
      description: 'ID of the target entity',
    }),
    url: t.exposeString('url', {
      nullable: true,
      description: 'URL to navigate to the target',
    }),
    preview: t.exposeString('preview', {
      nullable: true,
      description: 'Preview text for the target',
    }),
  }),
});

/**
 * Notification GraphQL Type
 *
 * Represents a notification sent to a user.
 */
export const NotificationType = builder.objectType('Notification', {
  fields: (t) => ({
    id: t.exposeID('id', {
      description: 'Unique identifier for the notification',
    }),
    userId: t.exposeID('userId', {
      description: 'ID of the user who received the notification',
    }),
    type: t.field({
      type: NotificationTypeEnum,
      description: 'Type of notification',
      resolve: (parent: any) => parent.type,
    }),
    title: t.exposeString('title', {
      description: 'Notification title',
    }),
    message: t.exposeString('message', {
      description: 'Notification message',
    }),
    status: t.field({
      type: NotificationStatusEnum,
      description: 'Current status of the notification',
      resolve: (parent: any) => parent.status,
    }),
    actor: t.field({
      type: NotificationActorType,
      nullable: true,
      description: 'User who triggered the notification',
      resolve: (parent: any) => parent.actor ?? null,
    }),
    target: t.field({
      type: NotificationTargetType,
      nullable: true,
      description: 'Target entity of the notification',
      resolve: (parent: any) => parent.target ?? null,
    }),
    createdAt: t.exposeString('createdAt', {
      description: 'Notification creation timestamp (ISO 8601)',
    }),
    readAt: t.exposeString('readAt', {
      nullable: true,
      description: 'When the notification was read (ISO 8601)',
    }),
  }),
});

/**
 * NotificationEdge Type
 *
 * Edge type for Relay-style cursor pagination.
 */
export const NotificationEdgeType = builder.objectType('NotificationEdge', {
  fields: (t) => ({
    cursor: t.exposeString('cursor', {
      description: 'Cursor for pagination',
    }),
    node: t.field({
      type: NotificationType,
      description: 'The notification node',
      resolve: (parent: any) => parent.node,
    }),
  }),
});

/**
 * NotificationConnection Type
 *
 * Relay-style connection for paginated notifications.
 */
export const NotificationConnectionType = builder.objectType('NotificationConnection', {
  fields: (t) => ({
    edges: t.field({
      type: [NotificationEdgeType],
      description: 'List of notification edges',
      resolve: (parent: any) => parent.edges,
    }),
    pageInfo: t.field({
      type: PageInfoType,
      description: 'Pagination information',
      resolve: (parent: any) => parent.pageInfo,
    }),
  }),
});

/**
 * MarkAllReadResponse Type
 *
 * Response for marking all notifications as read.
 */
export const MarkAllReadResponseType = builder.objectType('MarkAllReadResponse', {
  fields: (t) => ({
    updatedCount: t.exposeInt('updatedCount', {
      description: 'Number of notifications marked as read',
    }),
  }),
});
