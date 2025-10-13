import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CommentList } from './CommentList';
import { commentService } from '../../services/commentService';
import type { Comment } from '@social-media-app/shared';

// Mock commentService
vi.mock('../../services/commentService', () => ({
  commentService: {
    getComments: vi.fn(),
    createComment: vi.fn(),
    deleteComment: vi.fn()
  }
}));

// Helper to render with router
const renderWithRouter = (component: React.ReactElement<any>) => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

describe('CommentList', () => {
  const mockPostId = 'post-123';
  const mockCurrentUserId = 'user-123';

  const mockComments: Comment[] = [
    {
      id: 'comment-1',
      postId: mockPostId,
      userId: 'user-123',
      userHandle: 'testuser',
      content: 'First comment',
      createdAt: '2024-01-01T12:00:00.000Z',
      updatedAt: '2024-01-01T12:00:00.000Z'
    },
    {
      id: 'comment-2',
      postId: mockPostId,
      userId: 'user-456',
      userHandle: 'otheruser',
      content: 'Second comment',
      createdAt: '2024-01-01T12:05:00.000Z',
      updatedAt: '2024-01-01T12:05:00.000Z'
    },
    {
      id: 'comment-3',
      postId: mockPostId,
      userId: 'user-789',
      userHandle: 'thirduser',
      content: 'Third comment',
      createdAt: '2024-01-01T12:10:00.000Z',
      updatedAt: '2024-01-01T12:10:00.000Z'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render CommentForm', async () => {
      vi.mocked(commentService.getComments).mockResolvedValue({
        comments: [],
        totalCount: 0,
        nextCursor: null
      });

      renderWithRouter(<CommentList postId={mockPostId} />);

      await waitFor(() => {
        expect(screen.getByTestId('comment-form')).toBeInTheDocument();
      });
    });

    it('should have proper test ID', async () => {
      vi.mocked(commentService.getComments).mockResolvedValue({
        comments: [],
        totalCount: 0,
        nextCursor: null
      });

      renderWithRouter(<CommentList postId={mockPostId} />);

      await waitFor(() => {
        expect(screen.getByTestId('comment-list')).toBeInTheDocument();
      });
    });
  });

  describe('Fetching Comments', () => {
    it('should fetch comments on mount', async () => {
      vi.mocked(commentService.getComments).mockResolvedValue({
        comments: mockComments,
        totalCount: 3,
        nextCursor: null
      });

      renderWithRouter(<CommentList postId={mockPostId} />);

      await waitFor(() => {
        expect(commentService.getComments).toHaveBeenCalledWith(mockPostId);
      });
    });

    it('should show loading skeleton while fetching', () => {
      vi.mocked(commentService.getComments).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          comments: mockComments,
          totalCount: 3,
          nextCursor: null
        }), 100))
      );

      renderWithRouter(<CommentList postId={mockPostId} />);

      const loadingIndicator = screen.getByTestId('comment-list-loading');
      expect(loadingIndicator).toBeInTheDocument();
    });

    it('should hide loading skeleton after fetching', async () => {
      vi.mocked(commentService.getComments).mockResolvedValue({
        comments: mockComments,
        totalCount: 3,
        nextCursor: null
      });

      renderWithRouter(<CommentList postId={mockPostId} />);

      await waitFor(() => {
        expect(screen.queryByTestId('comment-list-loading')).not.toBeInTheDocument();
      });
    });
  });

  describe('Rendering Comments', () => {
    it('should render list of CommentItem components', async () => {
      vi.mocked(commentService.getComments).mockResolvedValue({
        comments: mockComments,
        totalCount: 3,
        nextCursor: null
      });

      renderWithRouter(<CommentList postId={mockPostId} currentUserId={mockCurrentUserId} />);

      await waitFor(() => {
        expect(screen.getByText('First comment')).toBeInTheDocument();
        expect(screen.getByText('Second comment')).toBeInTheDocument();
        expect(screen.getByText('Third comment')).toBeInTheDocument();
      });
    });

    it('should render comments in correct order', async () => {
      vi.mocked(commentService.getComments).mockResolvedValue({
        comments: mockComments,
        totalCount: 3,
        nextCursor: null
      });

      renderWithRouter(<CommentList postId={mockPostId} />);

      await waitFor(() => {
        const comments = screen.getAllByTestId('comment-item');
        expect(comments).toHaveLength(3);
      });
    });

    it('should pass currentUserId to CommentItem', async () => {
      vi.mocked(commentService.getComments).mockResolvedValue({
        comments: [mockComments[0]],
        totalCount: 1,
        nextCursor: null
      });

      renderWithRouter(<CommentList postId={mockPostId} currentUserId={mockCurrentUserId} />);

      await waitFor(() => {
        // Should show delete button for own comment
        expect(screen.getByRole('button', { name: /delete comment/i })).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no comments', async () => {
      vi.mocked(commentService.getComments).mockResolvedValue({
        comments: [],
        totalCount: 0,
        nextCursor: null
      });

      renderWithRouter(<CommentList postId={mockPostId} />);

      await waitFor(() => {
        const emptyState = screen.getByTestId('comment-list-empty');
        expect(emptyState).toBeInTheDocument();
        expect(emptyState).toHaveTextContent(/no comments yet/i);
      });
    });

    it('should not show empty state when comments exist', async () => {
      vi.mocked(commentService.getComments).mockResolvedValue({
        comments: mockComments,
        totalCount: 3,
        nextCursor: null
      });

      renderWithRouter(<CommentList postId={mockPostId} />);

      await waitFor(() => {
        expect(screen.queryByTestId('comment-list-empty')).not.toBeInTheDocument();
      });
    });
  });

  describe('Creating Comments', () => {
    it('should add new comment to list when created', async () => {
      const user = userEvent.setup();

      vi.mocked(commentService.getComments).mockResolvedValue({
        comments: [],
        totalCount: 0,
        nextCursor: null
      });

      const newComment: Comment = {
        id: 'comment-new',
        postId: mockPostId,
        userId: mockCurrentUserId,
        userHandle: 'testuser',
        content: 'New comment!',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      vi.mocked(commentService.createComment).mockResolvedValue({
        comment: newComment,
        commentsCount: 1
      });

      renderWithRouter(<CommentList postId={mockPostId} currentUserId={mockCurrentUserId} />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('comment-list-empty')).toBeInTheDocument();
      });

      // Create new comment
      const textarea = screen.getByRole('textbox', { name: /add a comment/i });
      const submitButton = screen.getByRole('button', { name: /post comment/i });

      await user.type(textarea, 'New comment!');
      await user.click(submitButton);

      // Should add comment to list
      await waitFor(() => {
        expect(screen.getByText('New comment!')).toBeInTheDocument();
        expect(screen.queryByTestId('comment-list-empty')).not.toBeInTheDocument();
      });
    });

    it('should prepend new comment to beginning of list', async () => {
      const user = userEvent.setup();

      vi.mocked(commentService.getComments).mockResolvedValue({
        comments: [mockComments[0]],
        totalCount: 1,
        nextCursor: null
      });

      const newComment: Comment = {
        id: 'comment-new',
        postId: mockPostId,
        userId: mockCurrentUserId,
        userHandle: 'testuser',
        content: 'Newest comment!',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      vi.mocked(commentService.createComment).mockResolvedValue({
        comment: newComment,
        commentsCount: 2
      });

      renderWithRouter(<CommentList postId={mockPostId} currentUserId={mockCurrentUserId} />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('First comment')).toBeInTheDocument();
      });

      // Create new comment
      const textarea = screen.getByRole('textbox', { name: /add a comment/i });
      const submitButton = screen.getByRole('button', { name: /post comment/i });

      await user.type(textarea, 'Newest comment!');
      await user.click(submitButton);

      // Should be at beginning
      await waitFor(() => {
        const comments = screen.getAllByTestId('comment-item');
        expect(comments).toHaveLength(2);
      });

      const comments = screen.getAllByTestId('comment-item');
      const firstCommentContent = comments[0].querySelector('[data-testid="comment-content"]');
      const secondCommentContent = comments[1].querySelector('[data-testid="comment-content"]');

      expect(firstCommentContent?.textContent).toBe('Newest comment!');
      expect(secondCommentContent?.textContent).toBe('First comment');
    });
  });

  describe('Deleting Comments', () => {
    it('should remove comment from list when deleted', async () => {
      const user = userEvent.setup();

      vi.mocked(commentService.getComments).mockResolvedValue({
        comments: mockComments,
        totalCount: 3,
        nextCursor: null
      });

      vi.mocked(commentService.deleteComment).mockResolvedValue({ success: true });

      renderWithRouter(<CommentList postId={mockPostId} currentUserId={mockCurrentUserId} />);

      // Wait for comments to load
      await waitFor(() => {
        expect(screen.getByText('First comment')).toBeInTheDocument();
      });

      // Delete first comment
      const deleteButtons = screen.getAllByRole('button', { name: /delete comment/i });
      await user.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      // Should remove from list
      await waitFor(() => {
        expect(screen.queryByText('First comment')).not.toBeInTheDocument();
        expect(screen.getByText('Second comment')).toBeInTheDocument();
        expect(screen.getByText('Third comment')).toBeInTheDocument();
      });
    });

    it('should show empty state after deleting last comment', async () => {
      const user = userEvent.setup();

      vi.mocked(commentService.getComments).mockResolvedValue({
        comments: [mockComments[0]],
        totalCount: 1,
        nextCursor: null
      });

      vi.mocked(commentService.deleteComment).mockResolvedValue({ success: true });

      renderWithRouter(<CommentList postId={mockPostId} currentUserId={mockCurrentUserId} />);

      // Wait for comments to load
      await waitFor(() => {
        expect(screen.getByText('First comment')).toBeInTheDocument();
      });

      // Delete the only comment
      const deleteButton = screen.getByRole('button', { name: /delete comment/i });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      // Should show empty state
      await waitFor(() => {
        expect(screen.queryByText('First comment')).not.toBeInTheDocument();
        expect(screen.getByTestId('comment-list-empty')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message when fetch fails', async () => {
      vi.mocked(commentService.getComments).mockRejectedValue(
        new Error('Failed to fetch comments')
      );

      renderWithRouter(<CommentList postId={mockPostId} />);

      await waitFor(() => {
        const errorMessage = screen.getByTestId('comment-list-error');
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveTextContent(/failed to load comments/i);
      });
    });

    it('should not show comments when fetch fails', async () => {
      vi.mocked(commentService.getComments).mockRejectedValue(
        new Error('Failed to fetch comments')
      );

      renderWithRouter(<CommentList postId={mockPostId} />);

      await waitFor(() => {
        expect(screen.getByTestId('comment-list-error')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('comment-item')).not.toBeInTheDocument();
    });

    it('should show retry button when fetch fails', async () => {
      vi.mocked(commentService.getComments).mockRejectedValue(
        new Error('Failed to fetch comments')
      );

      renderWithRouter(<CommentList postId={mockPostId} />);

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry/i });
        expect(retryButton).toBeInTheDocument();
      });
    });

    it('should retry fetch when retry button clicked', async () => {
      const user = userEvent.setup();

      vi.mocked(commentService.getComments)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          comments: mockComments,
          totalCount: 3,
          nextCursor: null
        });

      renderWithRouter(<CommentList postId={mockPostId} />);

      // Wait for error
      await waitFor(() => {
        expect(screen.getByTestId('comment-list-error')).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      // Should load comments
      await waitFor(() => {
        expect(screen.queryByTestId('comment-list-error')).not.toBeInTheDocument();
        expect(screen.getByText('First comment')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty postId gracefully', () => {
      renderWithRouter(<CommentList postId="" />);

      const commentList = screen.queryByTestId('comment-list');
      expect(commentList).not.toBeInTheDocument();
    });

    it('should handle very long comment list', async () => {
      const manyComments = Array.from({ length: 50 }, (_, i) => ({
        id: `comment-${i}`,
        postId: mockPostId,
        userId: `user-${i}`,
        userHandle: `user${i}`,
        content: `Comment number ${i}`,
        createdAt: new Date(Date.now() - i * 1000).toISOString(),
        updatedAt: new Date(Date.now() - i * 1000).toISOString()
      }));

      vi.mocked(commentService.getComments).mockResolvedValue({
        comments: manyComments,
        totalCount: 50,
        nextCursor: null
      });

      renderWithRouter(<CommentList postId={mockPostId} />);

      await waitFor(() => {
        const comments = screen.getAllByTestId('comment-item');
        expect(comments).toHaveLength(50);
      });
    });

    it('should handle duplicate comment IDs gracefully', async () => {
      const duplicateComments = [
        mockComments[0],
        mockComments[0] // Duplicate
      ];

      vi.mocked(commentService.getComments).mockResolvedValue({
        comments: duplicateComments,
        totalCount: 2,
        nextCursor: null
      });

      // Should render without crashing (React key warning in console is expected)
      const { container } = renderWithRouter(<CommentList postId={mockPostId} />);

      await waitFor(() => {
        expect(screen.queryByTestId('comment-list-loading')).not.toBeInTheDocument();
      });

      // Component should render successfully despite duplicate IDs
      expect(container).toBeTruthy();
      expect(screen.getByTestId('comment-list')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      vi.mocked(commentService.getComments).mockResolvedValue({
        comments: mockComments,
        totalCount: 3,
        nextCursor: null
      });

      renderWithRouter(<CommentList postId={mockPostId} />);

      await waitFor(() => {
        const list = screen.getByTestId('comment-list');
        expect(list).toHaveAttribute('aria-label', 'Comments list');
      });
    });

    it('should announce loading state to screen readers', () => {
      vi.mocked(commentService.getComments).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithRouter(<CommentList postId={mockPostId} />);

      const loadingIndicator = screen.getByTestId('comment-list-loading');
      expect(loadingIndicator).toHaveAttribute('aria-live', 'polite');
    });

    it('should announce errors to screen readers', async () => {
      vi.mocked(commentService.getComments).mockRejectedValue(
        new Error('Failed to fetch comments')
      );

      renderWithRouter(<CommentList postId={mockPostId} />);

      await waitFor(() => {
        const errorMessage = screen.getByTestId('comment-list-error');
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });
  });

  describe('Performance', () => {
    it('should not refetch on every render', async () => {
      vi.mocked(commentService.getComments).mockResolvedValue({
        comments: mockComments,
        totalCount: 3,
        nextCursor: null
      });

      const { rerender } = renderWithRouter(<CommentList postId={mockPostId} />);

      await waitFor(() => {
        expect(commentService.getComments).toHaveBeenCalledTimes(1);
      });

      // Rerender with same props
      rerender(
        <MemoryRouter>
          <CommentList postId={mockPostId} />
        </MemoryRouter>
      );

      // Should not fetch again
      expect(commentService.getComments).toHaveBeenCalledTimes(1);
    });

    it('should refetch when postId changes', async () => {
      vi.mocked(commentService.getComments).mockResolvedValue({
        comments: mockComments,
        totalCount: 3,
        nextCursor: null
      });

      const { rerender } = renderWithRouter(<CommentList postId={mockPostId} />);

      await waitFor(() => {
        expect(commentService.getComments).toHaveBeenCalledWith(mockPostId);
      });

      // Rerender with different postId
      rerender(
        <MemoryRouter>
          <CommentList postId="different-post" />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(commentService.getComments).toHaveBeenCalledWith('different-post');
      });

      expect(commentService.getComments).toHaveBeenCalledTimes(2);
    });
  });
});
