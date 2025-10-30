/**
 * NotificationsError Component
 * 
 * State component that displays an error message with retry functionality
 * Shows when notifications fail to load
 * 
 * @example
 * ```tsx
 * {error && (
 *   <NotificationsError
 *     message={error}
 *     onRetry={() => fetchNotifications()}
 *   />
 * )}
 * ```
 */

import React from 'react';
import type { VoidCallback } from '../../pages/NotificationsPage.types';

/**
 * NotificationsError Props
 * Using VoidCallback generic type for type-safe callbacks
 */
export interface NotificationsErrorProps {
  readonly message?: string;
  readonly onRetry: VoidCallback;
}

/**
 * NotificationsError Component
 * 
 * Displays an error state with:
 * - Error message (with sensible default)
 * - Retry button for user recovery
 * - Proper ARIA attributes for accessibility
 * 
 * Props are type-safe using NotificationsErrorProps interface
 */
export const NotificationsError: React.FC<NotificationsErrorProps> = ({
  message = 'Failed to load notifications. Please try again.',
  onRetry
}) => {
  // Use default message if empty string provided
  const displayMessage = message.trim() || 'Failed to load notifications. Please try again.';

  return (
    <div className="notifications-page__error" role="alert">
      <p>{displayMessage}</p>
      <button onClick={onRetry} className="notifications-page__retry-btn">
        Retry
      </button>
    </div>
  );
};
