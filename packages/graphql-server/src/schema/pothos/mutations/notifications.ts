/**
 * Notifications Mutations - Pothos Implementation
 *
 * This file defines all notification-related mutations using Pothos.
 *
 * Key Benefits over SDL:
 * - ✅ Inline type definitions with full autocomplete
 * - ✅ Built-in auth via authScopes (no manual HOC needed)
 * - ✅ Arguments are type-checked
 * - ✅ Resolver return types are validated
 */

import { builder } from '../builder.js';
import { NotificationType, MarkAllReadResponseType } from '../types/notifications.js';
import { DeleteResponseType } from '../types/comments.js';
import { executeUseCase } from '../../../resolvers/helpers/resolverHelpers.js';
import { UserId } from '../../../shared/types/index.js';
import type { GraphQLContext } from '../../../context.js';

/**
 * Notification Mutations
 */
builder.mutationFields((t) => ({
  /**
   * Mark Notification as Read Mutation
   *
   * Marks a specific notification as read.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated and notification owner
   */
  markNotificationAsRead: t.field({
    type: NotificationType,
    description: 'Mark a notification as read',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    args: {
      id: t.arg.id({
        required: true,
        description: 'ID of the notification to mark as read',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await executeUseCase(
        context.container,
        'markNotificationAsRead',
        {
          userId: UserId(context.userId!),
          notificationId: args.id,
        }
      );

      return result;
    },
  }),

  /**
   * Mark All Notifications as Read Mutation
   *
   * Marks all notifications for the current user as read.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated
   */
  markAllNotificationsAsRead: t.field({
    type: MarkAllReadResponseType,
    description: 'Mark all notifications as read',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await executeUseCase(
        context.container,
        'markAllNotificationsAsRead',
        {
          userId: UserId(context.userId!),
        }
      );

      return result;
    },
  }),

  /**
   * Delete Notification Mutation
   *
   * Deletes a specific notification. Idempotent operation.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated and notification owner
   */
  deleteNotification: t.field({
    type: DeleteResponseType,
    description: 'Delete a notification',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    args: {
      id: t.arg.id({
        required: true,
        description: 'ID of the notification to delete',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await executeUseCase(
        context.container,
        'deleteNotification',
        {
          userId: UserId(context.userId!),
          notificationId: args.id,
        }
      );

      return result;
    },
  }),
}));
