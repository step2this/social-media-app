/**
 * NotificationsLoading Component
 * 
 * State component that displays a loading spinner and message
 * Shows while notifications are being fetched
 * 
 * @example
 * ```tsx
 * {loading && <NotificationsLoading />}
 * ```
 */

import React from 'react';

/**
 * NotificationsLoading Component
 * 
 * Displays a loading state with:
 * - Animated spinner
 * - "Loading notifications..." message
 * - Proper ARIA attributes for screen readers
 * 
 * No props required - purely presentational
 */
export const NotificationsLoading: React.FC = () => {
  return (
    <div 
      className="notifications-page__loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="notifications-page__loading-spinner" />
      <p>Loading notifications...</p>
    </div>
  );
};
