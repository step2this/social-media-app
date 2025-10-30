import React from 'react';

export const FeedEmpty: React.FC = () => {
  return (
    <div className="feed-empty" data-testid="feed-empty" role="status">
      <span className="feed-empty__icon" aria-hidden="true">📭</span>
      <p>No posts yet! Follow some users to see their posts here.</p>
    </div>
  );
};
