import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentForm } from './CommentForm';
import { commentService } from '../../services/commentService';
import { createMockComment } from '../../test-utils/mock-factories';

// Mock commentService
vi.mock('../../services/commentService', () => ({
  commentService: {
    createComment: vi.fn()
  }
}));

// Test data constants
const TEST_POST_ID = 'post-123';
const VALID_COMMENT = 'Great post!';
const EXACTLY_MAX_COMMENT = 'a'.repeat(500);  // Edge case
const WHITESPACE_PADDED = '   Great post!   ';

/**
 * Helper to create successful comment mock response
 * Reduces duplication across tests
 */
function mockSuccessfulComment(overrides = {}) {
  const mockData = {
    comment: createMockComment({
      id: 'comment-123',
      postId: TEST_POST_ID,
      content: VALID_COMMENT,
      ...overrides
    }),
    commentsCount: 1
  };

  vi.mocked(commentService.createComment).mockResolvedValue({
    status: 'success',
    data: mockData
  });

  return mockData;
}

/**
 * Helper to create delayed successful comment mock
 * Used for testing loading states
 */
function mockDelayedComment(delayMs = 100, overrides = {}) {
  const mockData = {
    comment: createMockComment({
      id: 'comment-123',
      postId: TEST_POST_ID,
      content: VALID_COMMENT,
      ...overrides
    }),
    commentsCount: 1
  };

  vi.mocked(commentService.createComment).mockImplementation(
    () => new Promise((resolve) =>
      setTimeout(() => resolve({
        status: 'success',
        data: mockData
      }), delayMs)
    )
  );

  return mockData;
}

describe('CommentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render textarea and submit button', () => {
      render(<CommentForm postId={TEST_POST_ID} />);

      const textarea = screen.getByRole('textbox', { name: /add a comment/i });
      const submitButton = screen.getByRole('button', { name: /post comment/i });

      expect(textarea).toBeInTheDocument();
      expect(submitButton).toBeInTheDocument();
    });

    it('should show character counter', () => {
      render(<CommentForm postId={TEST_POST_ID} />);

      const counter = screen.getByTestId('comment-char-counter');
      expect(counter).toBeInTheDocument();
      expect(counter).toHaveTextContent('0/500');
    });
  });

  describe('Character Counter', () => {
    it('should update character counter as user types', async () => {
      const user = userEvent.setup();
      render(<CommentForm postId={TEST_POST_ID} />);

      const textarea = screen.getByRole('textbox', { name: /add a comment/i });
      const counter = screen.getByTestId('comment-char-counter');

      await user.type(textarea, 'Hello World');

      expect(counter).toHaveTextContent('11/500');
    });

    it('should show warning when approaching limit (>450 chars)', async () => {
      const user = userEvent.setup();
      render(<CommentForm postId={TEST_POST_ID} />);

      const textarea = screen.getByRole('textbox', { name: /add a comment/i });
      const counter = screen.getByTestId('comment-char-counter');
      const longText = 'a'.repeat(460);

      await user.type(textarea, longText);

      expect(counter).toHaveTextContent('460/500');
      expect(counter).toHaveClass('comment-form__counter--warning');
    });

    it('should show error when exceeding limit (>500 chars)', async () => {
      const user = userEvent.setup();
      render(<CommentForm postId={TEST_POST_ID} />);

      const textarea = screen.getByRole('textbox', { name: /add a comment/i });
      const counter = screen.getByTestId('comment-char-counter');
      const tooLongText = 'a'.repeat(510);

      await user.type(textarea, tooLongText);

      expect(counter).toHaveTextContent('510/500');
      expect(counter).toHaveClass('comment-form__counter--error');
    });
  });

  describe('Submit Button State', () => {
    it('should disable submit button when textarea is empty', () => {
      render(<CommentForm postId={TEST_POST_ID} />);

      const submitButton = screen.getByRole('button', { name: /post comment/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when text is entered', async () => {
      const user = userEvent.setup();
      render(<CommentForm postId={TEST_POST_ID} />);

      const textarea = screen.getByRole('textbox', { name: /add a comment/i });
      const submitButton = screen.getByRole('button', { name: /post comment/i });

      await user.type(textarea, VALID_COMMENT);

      expect(submitButton).toBeEnabled();
    });

    it('should disable submit button when exceeds 500 chars', async () => {
      const user = userEvent.setup();
      render(<CommentForm postId={TEST_POST_ID} />);

      const textarea = screen.getByRole('textbox', { name: /add a comment/i });
      const submitButton = screen.getByRole('button', { name: /post comment/i });
      const tooLongText = 'a'.repeat(510);

      await user.type(textarea, tooLongText);

      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button during submission', async () => {
      const user = userEvent.setup();
      mockDelayedComment(100);

      render(<CommentForm postId={TEST_POST_ID} />);

      const textarea = screen.getByRole('textbox', { name: /add a comment/i }) as HTMLTextAreaElement;
      const submitButton = screen.getByRole('button', { name: /post comment/i });

      await user.type(textarea, VALID_COMMENT);
      await user.click(submitButton);

      // Should be disabled immediately after click
      expect(submitButton).toBeDisabled();

      // Wait for submission to complete (form clears, so button becomes disabled again due to empty input)
      await waitFor(() => {
        expect(textarea.value).toBe('');
      });

      // Button should be disabled because input is now empty
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form Submission', () => {
    it('should call commentService.createComment on submit', async () => {
      const user = userEvent.setup();
      mockSuccessfulComment();

      render(<CommentForm postId={TEST_POST_ID} />);

      const textarea = screen.getByRole('textbox', { name: /add a comment/i });
      const submitButton = screen.getByRole('button', { name: /post comment/i });

      await user.type(textarea, VALID_COMMENT);
      await user.click(submitButton);

      await waitFor(() => {
        expect(commentService.createComment).toHaveBeenCalledWith(TEST_POST_ID, VALID_COMMENT);
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      mockDelayedComment(100);

      render(<CommentForm postId={TEST_POST_ID} />);

      const textarea = screen.getByRole('textbox', { name: /add a comment/i });
      const submitButton = screen.getByRole('button', { name: /post comment/i });

      await user.type(textarea, VALID_COMMENT);
      await user.click(submitButton);

      // Should show loading text
      expect(submitButton).toHaveTextContent(/posting/i);

      await waitFor(() => {
        expect(submitButton).toHaveTextContent(/post comment/i);
      });
    });

    it('should call onCommentCreated callback after success', async () => {
      const user = userEvent.setup();
      const mockOnCommentCreated = vi.fn();  // Local scope
      const mockData = mockSuccessfulComment();

      render(<CommentForm postId={TEST_POST_ID} onCommentCreated={mockOnCommentCreated} />);

      const textarea = screen.getByRole('textbox', { name: /add a comment/i });
      const submitButton = screen.getByRole('button', { name: /post comment/i });

      await user.type(textarea, VALID_COMMENT);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnCommentCreated).toHaveBeenCalledWith(mockData.comment);
      });
    });

    it('should clear input after successful submit', async () => {
      const user = userEvent.setup();
      mockSuccessfulComment();

      render(<CommentForm postId={TEST_POST_ID} />);

      const textarea = screen.getByRole('textbox', { name: /add a comment/i }) as HTMLTextAreaElement;
      const submitButton = screen.getByRole('button', { name: /post comment/i });

      await user.type(textarea, VALID_COMMENT);
      expect(textarea.value).toBe(VALID_COMMENT);

      await user.click(submitButton);

      await waitFor(() => {
        expect(textarea.value).toBe('');
      });
    });

    it('should reset character counter after successful submit', async () => {
      const user = userEvent.setup();
      mockSuccessfulComment();

      render(<CommentForm postId={TEST_POST_ID} />);

      const textarea = screen.getByRole('textbox', { name: /add a comment/i });
      const submitButton = screen.getByRole('button', { name: /post comment/i });
      const counter = screen.getByTestId('comment-char-counter');

      await user.type(textarea, VALID_COMMENT);
      expect(counter).toHaveTextContent('11/500');

      await user.click(submitButton);

      await waitFor(() => {
        expect(counter).toHaveTextContent('0/500');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle AsyncState error response', async () => {
      const user = userEvent.setup();

      // Mock AsyncState error (not rejected promise)
      vi.mocked(commentService.createComment).mockResolvedValue({
        status: 'error',
        error: {
          message: 'Service temporarily unavailable',
          extensions: { code: 'SERVICE_ERROR' }
        }
      });

      render(<CommentForm postId={TEST_POST_ID} />);

      const textarea = screen.getByRole('textbox', { name: /add a comment/i });
      const submitButton = screen.getByRole('button', { name: /post comment/i });

      await user.type(textarea, VALID_COMMENT);
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByTestId('comment-form-error');
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveTextContent(/failed to post comment/i);
      });
    });

    it('should show error message on submission failure', async () => {
      const user = userEvent.setup();
      vi.mocked(commentService.createComment).mockRejectedValue(
        new Error('Failed to create comment')
      );

      render(<CommentForm postId={TEST_POST_ID} />);

      const textarea = screen.getByRole('textbox', { name: /add a comment/i });
      const submitButton = screen.getByRole('button', { name: /post comment/i });

      await user.type(textarea, VALID_COMMENT);
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByTestId('comment-form-error');
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveTextContent(/failed to post comment/i);
      });
    });

    it('should preserve input text after submission failure', async () => {
      const user = userEvent.setup();
      vi.mocked(commentService.createComment).mockRejectedValue(
        new Error('Failed to create comment')
      );

      render(<CommentForm postId={TEST_POST_ID} />);

      const textarea = screen.getByRole('textbox', { name: /add a comment/i }) as HTMLTextAreaElement;
      const submitButton = screen.getByRole('button', { name: /post comment/i });

      await user.type(textarea, VALID_COMMENT);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('comment-form-error')).toBeInTheDocument();
      });

      // Text should still be there
      expect(textarea.value).toBe(VALID_COMMENT);
    });

    it('should clear error message when user types again', async () => {
      const user = userEvent.setup();
      vi.mocked(commentService.createComment).mockRejectedValue(
        new Error('Failed to create comment')
      );

      render(<CommentForm postId={TEST_POST_ID} />);

      const textarea = screen.getByRole('textbox', { name: /add a comment/i });
      const submitButton = screen.getByRole('button', { name: /post comment/i });

      await user.type(textarea, VALID_COMMENT);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('comment-form-error')).toBeInTheDocument();
      });

      // Type more text
      await user.type(textarea, ' Really!');

      // Error should be cleared
      expect(screen.queryByTestId('comment-form-error')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<CommentForm postId={TEST_POST_ID} />);

      const textarea = screen.getByRole('textbox', { name: /add a comment/i });
      expect(textarea).toHaveAttribute('aria-label', 'Add a comment');
    });

    it('should have proper ARIA attributes for character counter', () => {
      render(<CommentForm postId={TEST_POST_ID} />);

      const textarea = screen.getByRole('textbox');
      const counter = screen.getByTestId('comment-char-counter');

      expect(textarea).toHaveAttribute('aria-describedby');
      expect(counter).toHaveAttribute('id');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      mockSuccessfulComment();

      render(<CommentForm postId={TEST_POST_ID} />);

      const textarea = screen.getByRole('textbox', { name: /add a comment/i });
      const submitButton = screen.getByRole('button', { name: /post comment/i });

      // Tab to textarea
      await user.tab();
      expect(textarea).toHaveFocus();

      // Type comment
      await user.keyboard(VALID_COMMENT);

      // Tab to submit button
      await user.tab();
      expect(submitButton).toHaveFocus();

      // Press Enter to submit
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(commentService.createComment).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should allow exactly 500 characters', async () => {
      const user = userEvent.setup();
      mockSuccessfulComment({ content: EXACTLY_MAX_COMMENT });

      render(<CommentForm postId={TEST_POST_ID} />);

      const textarea = screen.getByRole('textbox', { name: /add a comment/i });
      const submitButton = screen.getByRole('button', { name: /post comment/i });
      const counter = screen.getByTestId('comment-char-counter');

      await user.type(textarea, EXACTLY_MAX_COMMENT);

      expect(counter).toHaveTextContent('500/500');
      expect(submitButton).toBeEnabled();

      await user.click(submitButton);

      await waitFor(() => {
        expect(commentService.createComment).toHaveBeenCalled();
      });
    });

    it('should handle empty postId gracefully', () => {
      render(<CommentForm postId="" />);

      const form = screen.queryByTestId('comment-form');
      expect(form).not.toBeInTheDocument();
    });

    it('should trim whitespace from comment content', async () => {
      const user = userEvent.setup();
      mockSuccessfulComment();

      render(<CommentForm postId={TEST_POST_ID} />);

      const textarea = screen.getByRole('textbox', { name: /add a comment/i });
      const submitButton = screen.getByRole('button', { name: /post comment/i });

      await user.type(textarea, WHITESPACE_PADDED);
      await user.click(submitButton);

      await waitFor(() => {
        expect(commentService.createComment).toHaveBeenCalledWith(TEST_POST_ID, VALID_COMMENT);
      });
    });

    it('should disable submit button for whitespace-only input', async () => {
      const user = userEvent.setup();
      render(<CommentForm postId={TEST_POST_ID} />);

      const textarea = screen.getByRole('textbox', { name: /add a comment/i });
      const submitButton = screen.getByRole('button', { name: /post comment/i });

      await user.type(textarea, '     ');

      expect(submitButton).toBeDisabled();
    });
  });
});
