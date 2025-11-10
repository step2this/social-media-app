import { useState, useCallback, FormEvent, ChangeEvent } from 'react';
import { useMutation, graphql } from 'react-relay';
import type { CommentFormRelayMutation } from './__generated__/CommentFormRelayMutation.graphql';
import type { Comment } from '@social-media-app/shared';
import './CommentForm.css';

interface CommentFormRelayProps {
  postId: string;
  onCommentCreated?: (comment: Comment) => void;
}

const MAX_COMMENT_LENGTH = 500;
const WARNING_THRESHOLD = 450;

/**
 * Relay-powered CommentForm component for creating comments on posts
 * Uses Relay mutations with optimistic updates
 */
export const CommentFormRelay = ({ postId, onCommentCreated }: CommentFormRelayProps) => {
  const [content, setContent] = useState('');
  const [displayError, setDisplayError] = useState<string | null>(null);

  const [commitCreateComment, isInFlight] = useMutation<CommentFormRelayMutation>(
    graphql`
      mutation CommentFormRelayMutation($input: CreateCommentInput!) {
        createComment(input: $input) {
          id
          postId
          userId
          content
          createdAt
          author {
            id
            handle
            username
          }
        }
      }
    `
  );

  if (!postId) {
    return null;
  }

  const charCount = content.length;
  const isOverLimit = charCount > MAX_COMMENT_LENGTH;
  const isNearLimit = charCount > WARNING_THRESHOLD;
  const trimmedContent = content.trim();
  const isValid = trimmedContent.length > 0 && !isOverLimit;

  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (displayError) {
      setDisplayError(null);
    }
  }, [displayError]);

  const handleSubmit = useCallback((e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isValid || isInFlight) {
      return;
    }

    const trimmedContent = content.trim();

    if (!trimmedContent || trimmedContent.length === 0 || trimmedContent.length > MAX_COMMENT_LENGTH) {
      const errorMsg = 'Please enter a valid comment';
      setDisplayError(errorMsg);
      return;
    }

    setDisplayError(null);

    commitCreateComment({
      variables: {
        input: {
          postId,
          content: trimmedContent,
        },
      },
      onCompleted: (response) => {
        setContent('');
        if (onCommentCreated && response.createComment) {
          onCommentCreated(response.createComment as unknown as Comment);
        }
      },
      onError: (error) => {
        console.error('Failed to create comment:', error);
        const errorMsg = 'Failed to post comment. Please try again.';
        setDisplayError(errorMsg);
      },
      updater: (store, data) => {
        if (!data.createComment) return;

        const postRecord = store.get(postId);
        if (postRecord) {
          const currentCommentsCount = postRecord.getValue('commentsCount') as number || 0;
          postRecord.setValue(currentCommentsCount + 1, 'commentsCount');
        }
      },
    });
  }, [isValid, isInFlight, content, postId, onCommentCreated, commitCreateComment]);

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
          disabled={isInFlight}
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
        disabled={!isValid || isInFlight}
        data-testid="comment-submit-button"
      >
        {isInFlight ? 'Posting...' : 'Post Comment'}
      </button>
    </form>
  );
};

// Export alias for backward compatibility
export { CommentFormRelay as CommentForm };
