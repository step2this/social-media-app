import React from 'react';

export interface FeedLoadingMoreProps {
  loading: boolean;
}

export const FeedLoadingMore: React.FC<FeedLoadingMoreProps> = ({ loading }) => {
  if (!loading) return null;
  return (
    <div className="feed-loading-more" aria-live="polite">
      <div className="spinner"></div>
      <p>Loading more...</p>
    </div>
  );
};
