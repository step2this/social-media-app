import React from 'react';
import './LoadingStates.css';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Reusable loading spinner component with 80s neon aesthetic
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Loading...",
  className = ""
}) => {
  return (
    <div className={`loading-container ${className}`}>
      <div className="neon-spinner">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      <div className="loading-message neon-text">{message}</div>
    </div>
  );
};

/**
 * Reusable error state component with 80s aesthetic
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  message = "Something went wrong",
  onRetry,
  className = ""
}) => {
  return (
    <div className={`error-container ${className}`}>
      <div className="error-icon">⚠️</div>
      <div className="error-message">{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn btn-retro error-retry-btn"
        >
          Try Again
        </button>
      )}
    </div>
  );
};