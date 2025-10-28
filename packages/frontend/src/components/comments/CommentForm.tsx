import { useState, useCallback, FormEvent, ChangeEvent } from 'react';
import { commentService } from '../../services/commentService';
import { isSuccess, isError } from '../../graphql/types';
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
  const [displayError, setDisplayError] = useState<string | null>(null);

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
    if (displayError) {
      setDisplayError(null);
    }
  }, [displayError]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isValid || isSubmitting) {
      return;
    }

    const trimmedContent = content.trim();

    if (!trimmedContent || trimmedContent.length === 0 || trimmedContent.length > MAX_COMMENT_LENGTH) {
      const errorMsg = 'Please enter a valid comment';
      setDisplayError(errorMsg);
      return;
    }

    setIsSubmitting(true);
    setDisplayError(null);

    try {
      const result = await commentService.createComment(postId, trimmedContent);

      // Check if the operation was successful
      if (!isSuccess(result)) {
        const errorMessage = isError(result)
          ? result.error.message
          : 'Failed to create comment';
        throw new Error(errorMessage);
      }

      // Clear input on success
      setContent('');
      setIsSubmitting(false);

      // Call callback if provided
      if (onCommentCreated) {
        onCommentCreated(result.data.comment);
      }
    } catch (err) {
      setIsSubmitting(false);
      console.error('Failed to create comment:', err);
      const errorMsg = 'Failed to post comment. Please try again.';
      setDisplayError(errorMsg);
    }
  }, [isValid, isSubmitting, content, postId, onCommentCreated]);

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

      {displayError && (
        <div
          className="comment-form__error"
          data-testid="comment-form-error"
          role="alert"
        >
          {displayError}
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
