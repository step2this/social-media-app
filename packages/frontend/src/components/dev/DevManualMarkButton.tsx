import { useState, useCallback } from 'react';
import { useFeedItemAutoRead } from '../../hooks/useFeedItemAutoRead';
import type { PostWithAuthor } from '@social-media-app/shared';
import './DevManualMarkButton.css';

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
 * Provides explicit control over marking posts as read using Relay mutation.
 *
 * @param props - Component props
 * @returns React component
 */
export function DevManualMarkButton({
  post,
  onMarkComplete
}: DevManualMarkButtonProps) {
  const [success, setSuccess] = useState(false);
  const { markAsRead, isInFlight, error: mutationError } = useFeedItemAutoRead();

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    setSuccess(false);

    markAsRead(post.id);

    if (!mutationError) {
      setSuccess(true);

      if (onMarkComplete) {
        onMarkComplete();
      }
    }
  }, [post.id, markAsRead, mutationError, onMarkComplete]);

  return (
    <form onSubmit={handleSubmit} className="dev-manual-mark-button">
      <button
        type="submit"
        disabled={isInFlight}
        className={`dev-manual-mark-button__btn ${
          isInFlight ? 'dev-manual-mark-button__btn--pending' : ''
        }`}
      >
        {isInFlight ? (
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

      {mutationError && (
        <span className="dev-manual-mark-button__message dev-manual-mark-button__message--error">
          ✗ {mutationError.message}
        </span>
      )}
    </form>
  );
}
