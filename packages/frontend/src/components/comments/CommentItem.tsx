import { useState, useCallback } from 'react';
import { useFragment, useMutation, graphql } from 'react-relay';
import { UserLink } from '../common/UserLink';
import { MaterialIcon } from '../common/MaterialIcon';
import type { CommentItem_comment$key } from './__generated__/CommentItem_comment.graphql';
import type { CommentItemDeleteMutation } from './__generated__/CommentItemDeleteMutation.graphql';
import './CommentItem.css';

interface CommentItemProps {
  comment: CommentItem_comment$key;
  currentUserId?: string;
  onCommentDeleted?: (commentId: string) => void;
}

/**
 * Format relative time from ISO timestamp
 */
const formatRelativeTime = (timestamp: string): string => {
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diffMs = now - time;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 10) {
    return 'just now';
  } else if (diffSeconds < 60) {
    return `${diffSeconds} seconds ago`;
  } else if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  } else if (diffDays < 7) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  } else {
    // For older comments, show date
    return new Date(timestamp).toLocaleDateString();
  }
};

/**
 * CommentItem component for displaying a single comment
 * Features user info, content, timestamp, and delete functionality
 */
export const CommentItem = ({
  comment: commentRef,
  currentUserId,
  onCommentDeleted
}: CommentItemProps) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const comment = useFragment(
    graphql`
      fragment CommentItem_comment on Comment {
        id
        userId
        content
        createdAt
        author {
          id
          handle
          username
        }
      }
    `,
    commentRef
  );

  const [commitDelete, isDeleting] = useMutation<CommentItemDeleteMutation>(
    graphql`
      mutation CommentItemDeleteMutation($id: ID!) {
        deleteComment(id: $id) {
          success
        }
      }
    `
  );

  const isOwnComment = currentUserId && currentUserId === comment.userId;
  const relativeTime = formatRelativeTime(comment.createdAt);

  /**
   * Handle delete button click - show confirmation
   */
  const handleDeleteClick = useCallback(() => {
    setShowConfirmation(true);
    setError(null);
  }, []);

  /**
   * Handle cancel deletion
   */
  const handleCancelDelete = useCallback(() => {
    setShowConfirmation(false);
  }, []);

  /**
   * Handle confirm deletion
   */
  const handleConfirmDelete = useCallback(() => {
    setError(null);

    commitDelete({
      variables: { id: comment.id },
      onCompleted: (response) => {
        if (response.deleteComment?.success) {
          // Call callback if provided
          if (onCommentDeleted) {
            onCommentDeleted(comment.id);
          }
          setShowConfirmation(false);
        } else {
          setError('Failed to delete comment. Please try again.');
        }
      },
      onError: (err) => {
        setError('Failed to delete comment. Please try again.');
        console.error('Failed to delete comment:', err);
      },
      updater: (store) => {
        // Remove the comment from the store
        store.delete(comment.id);
      }
    });
  }, [comment.id, onCommentDeleted, commitDelete]);

  return (
    <div className="comment-item" data-testid="comment-item">
      <div className="comment-item__avatar" data-testid="comment-avatar">
        {/* Placeholder avatar - could be replaced with actual image */}
        <div className="comment-item__avatar-placeholder">
          {comment.author.handle.charAt(0).toUpperCase()}
        </div>
      </div>

      <div className="comment-item__body">
        <div className="comment-item__header">
          <UserLink
            userId={comment.userId}
            username={comment.author.handle}
            className="comment-item__username"
          />

          <span className="comment-item__timestamp" data-testid="comment-timestamp">
            {relativeTime}
          </span>
        </div>

        <div className="comment-item__content" data-testid="comment-content">
          {comment.content}
        </div>

        {error && (
          <div className="comment-item__error" data-testid="comment-item-error" role="alert">
            {error}
          </div>
        )}

        {showConfirmation && (
          <div className="comment-item__confirmation" role="alertdialog" aria-labelledby="delete-confirm-title">
            <div className="comment-item__confirmation-text" id="delete-confirm-title">
              Are you sure you want to delete this comment?
            </div>
            <div className="comment-item__confirmation-actions">
              <button
                className="comment-item__confirmation-button comment-item__confirmation-button--cancel"
                onClick={handleCancelDelete}
                disabled={isDeleting}
                aria-label="Cancel deletion"
              >
                Cancel
              </button>
              <button
                className="comment-item__confirmation-button comment-item__confirmation-button--confirm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                aria-label="Confirm deletion"
              >
                {isDeleting ? 'Deleting...' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </div>

      {isOwnComment && (
        <div className="comment-item__actions">
          <button
            className="comment-item__delete-button"
            onClick={handleDeleteClick}
            disabled={isDeleting || showConfirmation}
            aria-label="Delete comment"
            title="Delete comment"
          >
            <MaterialIcon name="delete" size="sm" />
          </button>
        </div>
      )}

      {isDeleting && (
        <div className="comment-item__loading" data-testid="comment-item-loading">
          <div className="comment-item__loading-spinner" />
        </div>
      )}
    </div>
  );
};
