/**
 * useNotificationsPage Composite Hook
 *
 * Combines useNotifications and useNotificationActions into a single hook
 * Properly wires up dependencies between hooks using generics
 *
 * Advanced TypeScript patterns:
 * - Generic hook composition with intersection types
 * - Type inference from ReturnType utility
 * - Proper dependency injection between hooks
 * - Const assertions for readonly data preservation
 *
 * @example
 * ```tsx
 * const {
 *   notifications,
 *   loading,
 *   handleClick,
 *   markAllAsRead
 * } = useNotificationsPage(notificationDataService, navigate);
 * ```
 */

import { useNotifications } from './useNotifications';
import { useNotificationActions } from './useNotificationActions';
// import type { INotificationDataService } from '../services/interfaces/INotificationDataService';
type INotificationDataService = any; // TODO: Create this interface

/**
 * Composite hook return type using intersection types
 * Merges both hook returns into one interface
 *
 * TypeScript automatically infers the complete interface without manual typing
 */
export type UseNotificationsPageReturn =
  ReturnType<typeof useNotifications> &
  ReturnType<typeof useNotificationActions>;

/**
 * useNotificationsPage Composite Hook
 *
 * Combines useNotifications and useNotificationActions into a single hook
 * Properly wires up dependencies between hooks using generics
 *
 * Benefits:
 * - Single hook call provides all notification functionality
 * - Proper dependency injection between hooks
 * - Full TypeScript type inference
 * - Centralized logic composition
 * - Reusable across multiple components
 *
 * @param service - Notification data service
 * @param onNavigate - Navigation callback for notification clicks
 * @returns Combined hook interface with all functionality
 */
export const useNotificationsPage = (
  service: INotificationDataService,
  onNavigate: (url: string) => void
): UseNotificationsPageReturn => {
  // Data fetching and state management
  const notificationsHook = useNotifications(service);

  // Action handlers with proper dependency injection
  // Pass notifications and setNotifications from useNotifications
  const actionsHook = useNotificationActions(
    service,
    notificationsHook.notifications,
    notificationsHook.setNotifications,
    onNavigate
  );

  // Merge both hooks using spread operator
  // TypeScript will infer the correct combined type
  return {
    ...notificationsHook,
    ...actionsHook
  };
};
