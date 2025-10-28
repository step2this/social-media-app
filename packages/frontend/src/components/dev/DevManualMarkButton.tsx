import { useState, useCallback } from 'react';
import { FeedServiceGraphQL } from '../../services/implementations/FeedService.graphql';
import { createGraphQLClient } from '../../graphql/client';
import type { PostWithAuthor } from '@social-media-app/shared';
import './DevManualMarkButton.css';

// Initialize feed service
const feedService = new FeedServiceGraphQL(createGraphQLClient());

/**
 * Props for DevManualMarkButton component
 */
export interface DevManualMarkButtonProps {
  post: PostWithAuthor;
  onMarkComplete?: () => void;
}

/**
 * DevManualMarkButton Component
 *
 * Manual mark-as-read button for testing read state tracking.
 * Provides explicit control over marking posts as read.
 *
 * @param props - Component props
 * @returns React component
 */
export function DevManualMarkButton({
  post,
  onMarkComplete
}: DevManualMarkButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    setIsPending(true);
    setError(null);
    setSuccess(false);

    try {
      await feedService.markPostsAsRead({ postIds: [post.id] });
      setSuccess(true);
      setIsPending(false);

      if (onMarkComplete) {
        onMarkComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as read');
      setSuccess(false);
      setIsPending(false);
    }
  }, [post.id, onMarkComplete]);

  return (
    <form onSubmit={handleSubmit} className="dev-manual-mark-button">
      <button
        type="submit"
        disabled={isPending}
        className={`dev-manual-mark-button__btn ${
          isPending ? 'dev-manual-mark-button__btn--pending' : ''
        }`}
      >
        {isPending ? (
          <>
            <span className="dev-manual-mark-button__spinner"></span>
            Marking...
          </>
        ) : (
          `Mark ${post.id.slice(0, 8)}... as Read`
        )}
      </button>

      {success && (
        <span className="dev-manual-mark-button__message dev-manual-mark-button__message--success">
          ✓ Marked as read
        </span>
      )}

      {error && (
        <span className="dev-manual-mark-button__message dev-manual-mark-button__message--error">
          ✗ {error}
        </span>
      )}
    </form>
  );
}
