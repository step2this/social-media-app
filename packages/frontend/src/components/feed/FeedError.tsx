import React from 'react';
import './FeedError.css';

export interface FeedErrorProps {
  message: string;
  onRetry: () => void;
}

/**
 * Error state component for feed
 * Displays error message with retry button
 */
export const FeedError: React.FC<FeedErrorProps> = ({ message, onRetry }) => {
  return (
    <div className="feed-error" role="alert">
      <span className="feed-error__icon" aria-hidden="true">⚠️</span>
      <p className="feed-error__message">{message}</p>
      <button onClick={onRetry} className="feed-error__retry-btn">
        Retry
      </button>
    </div>
  );
};
