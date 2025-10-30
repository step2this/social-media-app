import React from 'react';
import './FeedLoading.css';

/**
 * Loading state component for feed
 * Displays a spinner and loading message
 */
export const FeedLoading: React.FC = () => {
  return (
    <div className="feed-loading" data-testid="feed-loading" aria-live="polite">
      <div className="feed-loading__spinner spinner" aria-label="Loading"></div>
      <p className="feed-loading__message">Loading your feed...</p>
    </div>
  );
};
