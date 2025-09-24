import React from 'react';

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
 * Reusable loading spinner component
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Loading...",
  className = ""
}) => {
  return (
    <div className={`flex justify-center items-center min-h-screen ${className}`}>
      <div className="text-lg">{message}</div>
    </div>
  );
};

/**
 * Reusable error state component
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  message = "Something went wrong",
  onRetry,
  className = ""
}) => {
  return (
    <div className={`flex flex-col justify-center items-center min-h-screen gap-4 ${className}`}>
      <div className="text-lg text-red-500">{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      )}
    </div>
  );
};