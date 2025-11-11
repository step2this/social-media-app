/**
 * Notifications Queries - Pothos Implementation
 *
 * This file defines all notification-related queries using Pothos.
 *
 * Key Benefits over SDL:
 * - ✅ Inline type definitions with full autocomplete
 * - ✅ Built-in auth via authScopes (no manual HOC needed)
 * - ✅ Arguments are type-checked
 * - ✅ Resolver return types are validated
 */

import { builder } from '../builder.js';
import { NotificationConnectionType } from '../types/notifications.js';
import { ErrorFactory } from '../../../infrastructure/errors/ErrorFactory.js';
import type { GraphQLContext } from '../../../context.js';

/**
 * Notification Queries
 */
builder.queryFields((t) => ({
  /**
   * Get Notifications Query
   *
   * Fetches paginated notifications for the current user.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated
   */
  notifications: t.field({
    type: NotificationConnectionType,
    description: 'Get paginated notifications for current user',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    args: {
      limit: t.arg.int({
        required: false,
        description: 'Number of notifications to fetch (default: 20)',
      }),
      cursor: t.arg.string({
        required: false,
        description: 'Cursor for pagination',
      }),
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await context.container
        .resolve('getNotifications')
        .execute(context.userId!, args.limit ?? 20, args.cursor ?? undefined);

      if (!result.success) {
        throw ErrorFactory.fromUseCaseError((result as { success: false; error: Error }).error);
      }

      if (!result.data) {
        throw ErrorFactory.internalServerError('Use case returned no data');
      }

      return result.data as any;
    },
  }),

  /**
   * Get Unread Notifications Count Query
   *
   * Gets the count of unread notifications for the current user.
   *
   * **Auth**: ✅ REQUIRED - User must be authenticated
   */
  unreadNotificationsCount: t.field({
    type: 'Int',
    description: 'Get count of unread notifications',

    // ✨ Built-in auth! No manual withAuth HOC needed
    authScopes: {
      authenticated: true,
    },

    resolve: async (parent, args, context: GraphQLContext) => {
      // ✅ context.userId is guaranteed to exist due to authScopes
      const result = await context.container
        .resolve('getUnreadNotificationsCount')
        .execute(context.userId!);

      if (!result.success) {
        throw ErrorFactory.fromUseCaseError((result as { success: false; error: Error }).error);
      }

      if (result.data === undefined || result.data === null) {
        throw ErrorFactory.internalServerError('Use case returned no data');
      }

      return result.data;
    },
  }),
}));
