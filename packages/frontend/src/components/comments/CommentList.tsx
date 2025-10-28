import { useState, useEffect, useCallback } from 'react';
import { commentService } from '../../services/commentService';
import { isSuccess, isError } from '../../graphql/types';
import { CommentForm } from './CommentForm';
import { CommentItem } from './CommentItem';
import type { Comment } from '@social-media-app/shared';
import './CommentList.css';

interface CommentListProps {
  postId: string;
  currentUserId?: string;
}

/**
 * CommentList component for displaying and managing comments on a post
 * Features fetching, creating, and deleting comments
 */
export const CommentList = ({ postId, currentUserId }: CommentListProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Don't render if missing postId
  if (!postId) {
    return null;
  }

  /**
   * Fetch comments for the post
   */
  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await commentService.getComments(postId);

      if (isSuccess(result)) {
        setComments(result.data.comments);
      } else if (isError(result)) {
        setError(result.error.message);
      }
    } catch (err) {
      setError('Failed to load comments. Please try again.');
      console.error('Failed to fetch comments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  /**
   * Fetch comments on mount and when postId changes
   */
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  /**
   * Handle new comment created
   */
  const handleCommentCreated = useCallback((comment: Comment) => {
    // Prepend new comment to beginning of list
    setComments((prev) => [comment, ...prev]);
  }, []);

  /**
   * Handle comment deleted
   */
  const handleCommentDeleted = useCallback((commentId: string) => {
    // Remove comment from list
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }, []);

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    fetchComments();
  }, [fetchComments]);

  return (
    <div className="comment-list" data-testid="comment-list" aria-label="Comments list">
      {/* Loading State */}
      {isLoading && (
        <div
          className="comment-list__loading"
          data-testid="comment-list-loading"
          aria-live="polite"
        >
          <div className="comment-list__skeleton">
            {[1, 2, 3].map((i) => (
              <div key={i} className="comment-skeleton">
                <div className="comment-skeleton__avatar" />
                <div className="comment-skeleton__content">
                  <div className="comment-skeleton__line comment-skeleton__line--short" />
                  <div className="comment-skeleton__line comment-skeleton__line--long" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="comment-list__error" data-testid="comment-list-error" role="alert">
          <p className="comment-list__error-message">{error}</p>
          <button
            className="comment-list__retry-button"
            onClick={handleRetry}
            aria-label="Retry loading comments"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && comments.length === 0 && (
        <div className="comment-list__empty" data-testid="comment-list-empty">
          <p className="comment-list__empty-message">
            No comments yet. Be the first to comment!
          </p>
        </div>
      )}

      {/* Comments List */}
      {!isLoading && !error && comments.length > 0 && (
        <div className="comment-list__items">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onCommentDeleted={handleCommentDeleted}
            />
          ))}
        </div>
      )}

      {/* Comment Form - at bottom */}
      <CommentForm postId={postId} onCommentCreated={handleCommentCreated} />
    </div>
  );
};
