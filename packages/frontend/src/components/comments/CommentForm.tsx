import { useState, useCallback, FormEvent, ChangeEvent } from 'react';
import { commentService } from '../../services/commentService';
import type { Comment } from '@social-media-app/shared';
import './CommentForm.css';

interface CommentFormProps {
  postId: string;
  onCommentCreated?: (comment: Comment) => void;
}

const MAX_COMMENT_LENGTH = 500;
const WARNING_THRESHOLD = 450;

/**
 * CommentForm component for creating comments on posts
 * Features character counter, validation, and error handling
 */
export const CommentForm = ({ postId, onCommentCreated }: CommentFormProps) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Don't render if missing postId
  if (!postId) {
    return null;
  }

  const charCount = content.length;
  const isOverLimit = charCount > MAX_COMMENT_LENGTH;
  const isNearLimit = charCount > WARNING_THRESHOLD;
  const trimmedContent = content.trim();
  const isValid = trimmedContent.length > 0 && !isOverLimit;

  /**
   * Handle textarea content change
   */
  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    // Clear error when user starts typing again
    if (error) {
      setError(null);
    }
  }, [error]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await commentService.createComment(postId, trimmedContent);

      // Clear input on success
      setContent('');

      // Call callback if provided
      if (onCommentCreated) {
        onCommentCreated(response.comment);
      }
    } catch (err) {
      setError('Failed to post comment. Please try again.');
      console.error('Failed to create comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [postId, trimmedContent, isValid, isSubmitting, onCommentCreated]);

  const counterClasses = [
    'comment-form__counter',
    isOverLimit && 'comment-form__counter--error',
    isNearLimit && !isOverLimit && 'comment-form__counter--warning'
  ].filter(Boolean).join(' ');

  const counterId = `comment-char-counter-${postId}`;

  return (
    <form
      className="comment-form"
      onSubmit={handleSubmit}
      data-testid="comment-form"
    >
      <div className="comment-form__input-wrapper">
        <textarea
          className="comment-form__textarea"
          value={content}
          onChange={handleChange}
          placeholder="Add a comment..."
          aria-label="Add a comment"
          aria-describedby={counterId}
          disabled={isSubmitting}
          rows={1}
          data-testid="comment-textarea"
        />

        <div
          className={counterClasses}
          id={counterId}
          data-testid="comment-char-counter"
          aria-live="polite"
        >
          {charCount}/{MAX_COMMENT_LENGTH}
        </div>
      </div>

      {error && (
        <div
          className="comment-form__error"
          data-testid="comment-form-error"
          role="alert"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        className="comment-form__submit"
        disabled={!isValid || isSubmitting}
        data-testid="comment-submit-button"
      >
        {isSubmitting ? 'Posting...' : 'Post Comment'}
      </button>
    </form>
  );
};
