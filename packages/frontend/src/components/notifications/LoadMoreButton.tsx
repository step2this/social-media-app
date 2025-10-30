/**
 * LoadMoreButton Component
 *
 * Simple component that renders a "Load more" button with loading state
 * Used for pagination in the notifications list
 *
 * @example
 * ```tsx
 * <LoadMoreButton
 *   onClick={() => loadMoreNotifications()}
 *   loading={loading}
 * />
 * ```
 */

import React from 'react';
import type { VoidCallback } from '../../pages/NotificationsPage.types';

/**
 * LoadMoreButton Props
 * Using VoidCallback generic type for type-safe callbacks
 */
export interface LoadMoreButtonProps {
  readonly onClick: VoidCallback;
  readonly loading: boolean;
}

/**
 * LoadMoreButton Component
 *
 * Renders a button for loading more notifications with:
 * - Dynamic text based on loading state
 * - Disabled state when loading
 * - Type-safe onClick handler
 *
 * Props are type-safe using LoadMoreButtonProps interface
 */
export const LoadMoreButton: React.FC<LoadMoreButtonProps> = ({
  onClick,
  loading
}) => {
  return (
    <div className="notifications-page__load-more">
      <button
        onClick={onClick}
        disabled={loading}
        className="notifications-page__load-more-btn"
      >
        {loading ? 'Loading...' : 'Load more'}
      </button>
    </div>
  );
};
