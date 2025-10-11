import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CommentItem } from './CommentItem';
import { commentService } from '../../services/commentService';
import type { Comment } from '@social-media-app/shared';

// Mock commentService
vi.mock('../../services/commentService', () => ({
  commentService: {
    deleteComment: vi.fn()
  }
}));

// Helper to render with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

describe('CommentItem', () => {
  const mockComment: Comment = {
    id: 'comment-123',
    postId: 'post-123',
    userId: 'user-123',
    userHandle: 'testuser',
    content: 'This is a great post!',
    createdAt: '2024-01-01T12:00:00.000Z',
    updatedAt: '2024-01-01T12:00:00.000Z'
  };

  const mockOnCommentDeleted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render comment content', () => {
      renderWithRouter(<CommentItem comment={mockComment} />);

      const content = screen.getByText('This is a great post!');
      expect(content).toBeInTheDocument();
    });

    it('should render user avatar placeholder', () => {
      renderWithRouter(<CommentItem comment={mockComment} />);

      const avatar = screen.getByTestId('comment-avatar');
      expect(avatar).toBeInTheDocument();
    });

    it('should render UserLink with correct handle', () => {
      renderWithRouter(<CommentItem comment={mockComment} />);

      const userLink = screen.getByRole('link', { name: /view profile of @testuser/i });
      expect(userLink).toBeInTheDocument();
      expect(userLink).toHaveAttribute('href', '/profile/testuser');
    });

    it('should render relative timestamp', () => {
      renderWithRouter(<CommentItem comment={mockComment} />);

      const timestamp = screen.getByTestId('comment-timestamp');
      expect(timestamp).toBeInTheDocument();
      // Should show some time format (exact format depends on implementation)
      expect(timestamp.textContent).toBeTruthy();
    });

    it('should have proper test IDs', () => {
      renderWithRouter(<CommentItem comment={mockComment} />);

      expect(screen.getByTestId('comment-item')).toBeInTheDocument();
      expect(screen.getByTestId('comment-content')).toBeInTheDocument();
      expect(screen.getByTestId('comment-avatar')).toBeInTheDocument();
      expect(screen.getByTestId('comment-timestamp')).toBeInTheDocument();
    });
  });

  describe('Delete Button Visibility', () => {
    it('should show delete button for own comments', () => {
      renderWithRouter(
        <CommentItem comment={mockComment} currentUserId="user-123" />
      );

      const deleteButton = screen.getByRole('button', { name: /delete comment/i });
      expect(deleteButton).toBeInTheDocument();
    });

    it('should hide delete button for other users comments', () => {
      renderWithRouter(
        <CommentItem comment={mockComment} currentUserId="different-user" />
      );

      const deleteButton = screen.queryByRole('button', { name: /delete comment/i });
      expect(deleteButton).not.toBeInTheDocument();
    });

    it('should hide delete button when no currentUserId provided', () => {
      renderWithRouter(<CommentItem comment={mockComment} />);

      const deleteButton = screen.queryByRole('button', { name: /delete comment/i });
      expect(deleteButton).not.toBeInTheDocument();
    });
  });

  describe('Delete Confirmation', () => {
    it('should show confirmation dialog when delete button clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(
        <CommentItem comment={mockComment} currentUserId="user-123" />
      );

      const deleteButton = screen.getByRole('button', { name: /delete comment/i });
      await user.click(deleteButton);

      // Should show confirmation
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should cancel deletion when cancel button clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(
        <CommentItem comment={mockComment} currentUserId="user-123" />
      );

      const deleteButton = screen.getByRole('button', { name: /delete comment/i });
      await user.click(deleteButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Confirmation should be hidden
      expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();

      // Should not call delete service
      expect(commentService.deleteComment).not.toHaveBeenCalled();
    });

    it('should call commentService.deleteComment when confirmed', async () => {
      const user = userEvent.setup();
      vi.mocked(commentService.deleteComment).mockResolvedValue({ success: true });

      renderWithRouter(
        <CommentItem comment={mockComment} currentUserId="user-123" />
      );

      const deleteButton = screen.getByRole('button', { name: /delete comment/i });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(commentService.deleteComment).toHaveBeenCalledWith('comment-123');
      });
    });

    it('should call onCommentDeleted callback after successful deletion', async () => {
      const user = userEvent.setup();
      vi.mocked(commentService.deleteComment).mockResolvedValue({ success: true });

      renderWithRouter(
        <CommentItem
          comment={mockComment}
          currentUserId="user-123"
          onCommentDeleted={mockOnCommentDeleted}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete comment/i });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnCommentDeleted).toHaveBeenCalledWith('comment-123');
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state during deletion', async () => {
      const user = userEvent.setup();
      vi.mocked(commentService.deleteComment).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      renderWithRouter(
        <CommentItem comment={mockComment} currentUserId="user-123" />
      );

      const deleteButton = screen.getByRole('button', { name: /delete comment/i });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      // Should show loading state
      const loadingIndicator = screen.getByTestId('comment-item-loading');
      expect(loadingIndicator).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId('comment-item-loading')).not.toBeInTheDocument();
      });
    });

    it('should disable buttons during deletion', async () => {
      const user = userEvent.setup();
      vi.mocked(commentService.deleteComment).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      renderWithRouter(
        <CommentItem comment={mockComment} currentUserId="user-123" />
      );

      const deleteButton = screen.getByRole('button', { name: /delete comment/i });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      // Buttons should be disabled
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          expect(button).toBeDisabled();
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message when deletion fails', async () => {
      const user = userEvent.setup();
      vi.mocked(commentService.deleteComment).mockRejectedValue(
        new Error('Failed to delete comment')
      );

      renderWithRouter(
        <CommentItem comment={mockComment} currentUserId="user-123" />
      );

      const deleteButton = screen.getByRole('button', { name: /delete comment/i });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        const errorMessage = screen.getByTestId('comment-item-error');
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveTextContent(/failed to delete comment/i);
      });
    });

    it('should not call onCommentDeleted when deletion fails', async () => {
      const user = userEvent.setup();
      vi.mocked(commentService.deleteComment).mockRejectedValue(
        new Error('Failed to delete comment')
      );

      renderWithRouter(
        <CommentItem
          comment={mockComment}
          currentUserId="user-123"
          onCommentDeleted={mockOnCommentDeleted}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete comment/i });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByTestId('comment-item-error')).toBeInTheDocument();
      });

      expect(mockOnCommentDeleted).not.toHaveBeenCalled();
    });

    it('should allow retry after deletion failure', async () => {
      const user = userEvent.setup();
      vi.mocked(commentService.deleteComment)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true });

      renderWithRouter(
        <CommentItem
          comment={mockComment}
          currentUserId="user-123"
          onCommentDeleted={mockOnCommentDeleted}
        />
      );

      // First attempt - fails
      const deleteButton = screen.getByRole('button', { name: /delete comment/i });
      await user.click(deleteButton);

      let confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByTestId('comment-item-error')).toBeInTheDocument();
      });

      // Second attempt - succeeds
      await user.click(deleteButton);
      confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnCommentDeleted).toHaveBeenCalledWith('comment-123');
      });
    });
  });

  describe('Relative Time Display', () => {
    it('should show "just now" for recent comments', () => {
      const recentComment = {
        ...mockComment,
        createdAt: new Date().toISOString()
      };

      renderWithRouter(<CommentItem comment={recentComment} />);

      const timestamp = screen.getByTestId('comment-timestamp');
      expect(timestamp.textContent).toMatch(/just now|seconds ago/i);
    });

    it('should show minutes for older comments', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const olderComment = {
        ...mockComment,
        createdAt: fiveMinutesAgo
      };

      renderWithRouter(<CommentItem comment={olderComment} />);

      const timestamp = screen.getByTestId('comment-timestamp');
      expect(timestamp.textContent).toMatch(/minutes ago/i);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for delete button', () => {
      renderWithRouter(
        <CommentItem comment={mockComment} currentUserId="user-123" />
      );

      const deleteButton = screen.getByRole('button', { name: /delete comment/i });
      expect(deleteButton).toHaveAttribute('aria-label');
    });

    it('should have proper role for confirmation dialog', async () => {
      const user = userEvent.setup();
      renderWithRouter(
        <CommentItem comment={mockComment} currentUserId="user-123" />
      );

      const deleteButton = screen.getByRole('button', { name: /delete comment/i });
      await user.click(deleteButton);

      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      vi.mocked(commentService.deleteComment).mockResolvedValue({ success: true });

      renderWithRouter(
        <CommentItem comment={mockComment} currentUserId="user-123" />
      );

      const deleteButton = screen.getByRole('button', { name: /delete comment/i });

      // Focus delete button
      deleteButton.focus();
      expect(deleteButton).toHaveFocus();

      // Press Enter to open confirmation
      await user.keyboard('{Enter}');

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();

      // Tab to confirm button and press Enter
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      confirmButton.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(commentService.deleteComment).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content gracefully', () => {
      const emptyComment = {
        ...mockComment,
        content: ''
      };

      renderWithRouter(<CommentItem comment={emptyComment} />);

      const content = screen.getByTestId('comment-content');
      expect(content).toBeInTheDocument();
      expect(content.textContent).toBe('');
    });

    it('should handle long content with line breaks', () => {
      const longComment = {
        ...mockComment,
        content: 'Line 1\nLine 2\nLine 3\n'.repeat(10)
      };

      renderWithRouter(<CommentItem comment={longComment} />);

      const content = screen.getByTestId('comment-content');
      expect(content).toBeInTheDocument();
    });

    it('should handle special characters in content', () => {
      const specialComment = {
        ...mockComment,
        content: 'Hello <script>alert("xss")</script> & "quotes" & \'apostrophes\''
      };

      renderWithRouter(<CommentItem comment={specialComment} />);

      const content = screen.getByTestId('comment-content');
      // Should render as text, not execute script
      expect(content.textContent).toContain('<script>');
    });

    it('should handle missing userHandle gracefully', () => {
      const noHandleComment = {
        ...mockComment,
        userHandle: ''
      };

      renderWithRouter(<CommentItem comment={noHandleComment} />);

      // Should still render, even if UserLink doesn't show
      expect(screen.getByTestId('comment-item')).toBeInTheDocument();
    });
  });
});
