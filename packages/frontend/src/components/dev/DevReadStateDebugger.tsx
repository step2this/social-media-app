import type { FeedPostItem } from '@social-media-app/shared';
import './DevReadStateDebugger.css';

/**
 * Props for DevReadStateDebugger component
 */
export interface DevReadStateDebuggerProps {
  posts: readonly FeedPostItem[];
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
export function DevReadStateDebugger({ posts }: DevReadStateDebuggerProps) {
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
      <h3 className="dev-read-state-debugger__title">Read State Debugger</h3>
      <table className="dev-read-state-debugger__table" role="table">
        <thead className="dev-read-state-debugger__header">
          <tr>
            <th className="dev-read-state-debugger__header-cell">Status</th>
            <th className="dev-read-state-debugger__header-cell">Post ID</th>
            <th className="dev-read-state-debugger__header-cell">Handle</th>
            <th className="dev-read-state-debugger__header-cell">Read At</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id} className="dev-read-state-debugger__row">
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
          ))}
        </tbody>
      </table>
    </div>
  );
}