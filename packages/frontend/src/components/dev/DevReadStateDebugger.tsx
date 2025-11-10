import { useState } from 'react';
// import type { FeedPostItem } from '@social-media-app/shared';
type FeedPostItem = any; // TODO: Export FeedPostItem from shared package
import './DevReadStateDebugger.css';

/**
 * Props for DevReadStateDebugger component
 */
export interface DevReadStateDebuggerProps {
  posts: readonly FeedPostItem[];
  /**
   * Current logged-in user ID (optional)
   * When provided, highlights posts belonging to this user
   */
  currentUserId?: string;
}

/**
 * Format a date to a readable timestamp string
 */
function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * DevReadStateDebugger Component
 *
 * Displays a table showing read/unread status for all posts in the feed.
 * Useful for debugging the read state tracking system.
 *
 * @param props - Component props
 * @returns React component
 */
export function DevReadStateDebugger({ posts, currentUserId }: DevReadStateDebuggerProps) {
  const [hideRead, setHideRead] = useState(false);

  // Filter posts based on hideRead toggle
  const displayedPosts = hideRead ? posts.filter((post) => !post.isRead) : posts;

  // Count read/unread posts
  const readCount = posts.filter((post) => post.isRead).length;
  const unreadCount = posts.filter((post) => !post.isRead).length;

  if (posts.length === 0) {
    return (
      <div className="dev-read-state-debugger">
        <h3 className="dev-read-state-debugger__title">Read State Debugger</h3>
        <p className="dev-read-state-debugger__empty">No posts available</p>
      </div>
    );
  }

  return (
    <div className="dev-read-state-debugger">
      <div className="dev-read-state-debugger__header">
        <h3 className="dev-read-state-debugger__title">
          Read State Debugger
          {currentUserId && (
            <span className="dev-read-state-debugger__user-badge">
              User: {currentUserId.slice(0, 8)}...
            </span>
          )}
        </h3>
        <div className="dev-read-state-debugger__controls">
          <div className="dev-read-state-debugger__stats">
            <span className="dev-read-state-debugger__stat dev-read-state-debugger__stat--read">
              ✓ {readCount}
            </span>
            <span className="dev-read-state-debugger__stat dev-read-state-debugger__stat--unread">
              ○ {unreadCount}
            </span>
          </div>
          <button
            onClick={() => setHideRead(!hideRead)}
            className={`dev-read-state-debugger__toggle ${
              hideRead ? 'dev-read-state-debugger__toggle--active' : ''
            }`}
            type="button"
          >
            {hideRead ? '👁️ Show Read' : '🙈 Hide Read'}
          </button>
        </div>
      </div>

      {displayedPosts.length === 0 ? (
        <p className="dev-read-state-debugger__empty">
          All posts are read! Toggle "Show Read" to see them.
        </p>
      ) : (
        <table className="dev-read-state-debugger__table" role="table">
        <thead className="dev-read-state-debugger__header">
          <tr>
            <th className="dev-read-state-debugger__header-cell">Status</th>
            <th className="dev-read-state-debugger__header-cell">Post ID</th>
            <th className="dev-read-state-debugger__header-cell">Author</th>
            <th className="dev-read-state-debugger__header-cell">Read At</th>
          </tr>
        </thead>
        <tbody>
          {displayedPosts.map((post) => {
            const isOwnPost = currentUserId && post.userId === currentUserId;
            return (
              <tr
                key={post.id}
                className={`dev-read-state-debugger__row ${
                  isOwnPost ? 'dev-read-state-debugger__row--own-post' : ''
                }`}
              >
                <td className="dev-read-state-debugger__cell">
                  <span
                    className={`dev-read-state-debugger__status-icon ${
                      post.isRead
                        ? 'dev-read-state-debugger__status-icon--read'
                        : 'dev-read-state-debugger__status-icon--unread'
                    }`}
                  >
                    {post.isRead ? '✓' : '○'}
                  </span>
                </td>
                <td className="dev-read-state-debugger__cell">
                  <span className="dev-read-state-debugger__post-id">
                    {post.id.slice(0, 8)}...
                  </span>
                </td>
                <td className="dev-read-state-debugger__cell">
                  <a
                    href={`/profile/${post.userHandle}`}
                    className="dev-read-state-debugger__handle"
                  >
                    @{post.userHandle}
                    {isOwnPost && (
                      <span className="dev-read-state-debugger__own-badge">YOU</span>
                    )}
                  </a>
                </td>
                <td className="dev-read-state-debugger__cell">
                  {post.readAt ? (
                    <span className="dev-read-state-debugger__timestamp">
                      {formatTimestamp(post.readAt)}
                    </span>
                  ) : (
                    <span className="dev-read-state-debugger__timestamp">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      )}
    </div>
  );
}