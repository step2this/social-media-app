import { useActionState, useEffect, useRef } from 'react';
import { feedService } from '../../services/feedService';
import type { FeedPostItem } from '@social-media-app/shared';
import './DevManualMarkButton.css';

/**
 * Props for DevManualMarkButton component
 */
export interface DevManualMarkButtonProps {
  post: FeedPostItem;
  onMarkComplete?: () => void;
}

/**
 * State for the mark action
 */
interface MarkActionState {
  success: boolean;
  error: string | null;
}

/**
 * Action function for marking posts as read
 * Must be defined outside component for stability with useActionState
 */
async function markAsReadAction(
  prevState: MarkActionState,
  postId: string
): Promise<MarkActionState> {
  try {
    await feedService.markPostsAsRead([postId]);
    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark as read'
    };
  }
}

/**
 * DevManualMarkButton Component
 *
 * Manual mark-as-read button using React 19's useActionState hook.
 * Provides explicit control for testing read state tracking.
 *
 * @param props - Component props
 * @returns React component
 */
export function DevManualMarkButton({
  post,
  onMarkComplete
}: DevManualMarkButtonProps) {
  const [state, formAction, isPending] = useActionState(markAsReadAction, {
    success: false,
    error: null
  });

  const previousSuccessRef = useRef(false);

  // Call onMarkComplete when state changes to success
  useEffect(() => {
    if (state.success && !previousSuccessRef.current && onMarkComplete) {
      previousSuccessRef.current = true;
      onMarkComplete();
    }
  }, [state.success, onMarkComplete]);

  const handleSubmit = (formData: FormData) => {
    formAction(post.id);
  };

  return (
    <form action={handleSubmit} className="dev-manual-mark-button">
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

      {state.success && (
        <span className="dev-manual-mark-button__message dev-manual-mark-button__message--success">
          ✓ Marked as read
        </span>
      )}

      {state.error && (
        <span className="dev-manual-mark-button__message dev-manual-mark-button__message--error">
          ✗ {state.error}
        </span>
      )}
    </form>
  );
}