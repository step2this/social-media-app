import React from 'react';

export const FeedEndMessage: React.FC = () => {
  return (
    <div className="feed-end" data-testid="feed-end" role="status">
      <span className="feed-end__icon" aria-hidden="true">🎉</span>
      <p>You're all caught up!</p>
    </div>
  );
};
