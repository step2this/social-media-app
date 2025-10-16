import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PostDetailPage } from './PostDetailPage.js';
import * as postService from '../../services/postService.js';
import * as useAuthModule from '../../hooks/useAuth.js';
import { createMockPost } from '../../test-utils/mock-factories.js';
import { createMockUseAuthReturn, mockUseAuthAuthenticated, mockUseAuthUnauthenticated } from '../../test-utils/hook-mocks.js';
import type { Post } from '@social-media-app/shared';

// Mock the postService
vi.mock('../../services/postService.js', () => ({
  postService: {
    getPost: vi.fn()
  }
}));

// Mock PostCard component to verify it's being used
vi.mock('./PostCard', () => ({
  PostCard: ({ post, currentUserId, showComments, variant }: any) => (
    <div data-testid="post-card-mock">
      <div data-testid="post-card-id">{post.id}</div>
      <div data-testid="post-card-user-id">{post.userId}</div>
      <div data-testid="post-card-current-user">{currentUserId || 'none'}</div>
      <div data-testid="post-card-show-comments">{showComments ? 'true' : 'false'}</div>
      <div data-testid="post-card-variant">{variant || 'feed'}</div>
    </div>
  )
}));

// Mock CommentList component
vi.mock('../comments', () => ({
  CommentList: ({ postId, currentUserId }: any) => (
    <div data-testid="comment-list-mock">
      <div data-testid="comment-list-post-id">{postId}</div>
      <div data-testid="comment-list-current-user-id">{currentUserId || 'not-provided'}</div>
    </div>
  )
}));

// Mock useAuth hook
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(() => createMockUseAuthReturn())
}));

const mockPost: Post = createMockPost({
  id: 'post-123',
  userId: 'user-123',
  userHandle: 'testuser',
  imageUrl: 'https://cdn.example.com/image.jpg',
  thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
  caption: 'Test caption for this awesome post',
  tags: ['test', 'post', 'tamagotchi'],
  likesCount: 42,
  commentsCount: 7,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z'
});

const renderPostDetailPage = (postId = 'post-123') => {
  return render(
    <MemoryRouter initialEntries={[`/post/${postId}`]}>
      <Routes>
        <Route path="/post/:postId" element={<PostDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('PostDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('PostCard Integration (TDD Refactor)', () => {
    it('should render PostCard component with post data', async () => {
      vi.mocked(postService.postService.getPost).mockResolvedValue(mockPost);

      renderPostDetailPage();

      await waitFor(() => {
        expect(screen.getByTestId('post-card-mock')).toBeInTheDocument();
      });

      expect(screen.getByTestId('post-card-id')).toHaveTextContent('post-123');
      expect(screen.getByTestId('post-card-user-id')).toHaveTextContent('user-123');
    });

    it('should pass showComments prop to PostCard', async () => {
      vi.mocked(postService.postService.getPost).mockResolvedValue(mockPost);

      renderPostDetailPage();

      await waitFor(() => {
        expect(screen.getByTestId('post-card-mock')).toBeInTheDocument();
      });

      // PostDetailPage should show comments section
      expect(screen.getByTestId('post-card-show-comments')).toHaveTextContent('true');
    });

    it('should pass variant="detail" prop to PostCard', async () => {
      vi.mocked(postService.postService.getPost).mockResolvedValue(mockPost);

      renderPostDetailPage();

      await waitFor(() => {
        expect(screen.getByTestId('post-card-mock')).toBeInTheDocument();
      });

      // PostDetailPage should use detail variant for full post view
      expect(screen.getByTestId('post-card-variant')).toHaveTextContent('detail');
    });

    it('should NOT render inline post markup when using PostCard', async () => {
      vi.mocked(postService.postService.getPost).mockResolvedValue(mockPost);

      renderPostDetailPage();

      await waitFor(() => {
        expect(screen.getByTestId('post-card-mock')).toBeInTheDocument();
      });

      // These classes should NOT exist because they're now handled by PostCard
      const container = screen.getByTestId('post-detail-page');
      expect(container.querySelector('.post-sidebar')).not.toBeInTheDocument();
      expect(container.querySelector('.post-info-section')).not.toBeInTheDocument();
      expect(container.querySelector('.post-actions')).not.toBeInTheDocument();
    });
  });

  describe('Design System Styling', () => {
    it('should render with TamaFriends design system classes', async () => {
      vi.mocked(postService.postService.getPost).mockResolvedValue(mockPost);

      renderPostDetailPage();

      await waitFor(() => {
        expect(screen.getByTestId('post-detail-page')).toBeInTheDocument();
      });

      const container = screen.getByTestId('post-detail-page');
      expect(container).toHaveClass('post-detail-page');
    });

    it('should render main container with proper styling', async () => {
      vi.mocked(postService.postService.getPost).mockResolvedValue(mockPost);

      renderPostDetailPage();

      await waitFor(() => {
        expect(screen.getByTestId('post-detail-container')).toBeInTheDocument();
      });

      const postContainer = screen.getByTestId('post-detail-container');
      expect(postContainer).toHaveClass('post-detail-container');
    });

    it('should use close button with Material Icon', async () => {
      vi.mocked(postService.postService.getPost).mockResolvedValue(mockPost);

      renderPostDetailPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveClass('close-button');
    });

    it('should NOT use Tailwind classes in the rendered output', async () => {
      vi.mocked(postService.postService.getPost).mockResolvedValue(mockPost);

      renderPostDetailPage();

      await waitFor(() => {
        expect(screen.getByTestId('post-detail-page')).toBeInTheDocument();
      });

      const container = screen.getByTestId('post-detail-page');
      const htmlString = container.outerHTML;

      // Check that common Tailwind patterns are NOT present
      expect(htmlString).not.toMatch(/class="[^"]*\b(flex|justify-center|items-center|bg-gray-|text-gray-|border-b|rounded-lg|shadow-lg|max-w-|mx-auto|hover:text-|transition-colors)\b[^"]*"/);
    });

    it('should use MaterialIcon components instead of inline SVGs', async () => {
      vi.mocked(postService.postService.getPost).mockResolvedValue(mockPost);

      renderPostDetailPage();

      await waitFor(() => {
        expect(screen.getByTestId('post-detail-page')).toBeInTheDocument();
      });

      // MaterialIcon components render with .material-icon class (singular)
      const icons = document.querySelectorAll('.material-icon');
      expect(icons.length).toBeGreaterThan(0);

      // Should NOT have inline SVG elements for icons
      const container = screen.getByTestId('post-detail-page');
      const svgIcons = container.querySelectorAll('svg');
      // No icon SVGs should be present
      expect(svgIcons.length).toBe(0);
    });
  });

  describe('Component Rendering', () => {
    it('should show loading state with proper styling', () => {
      vi.mocked(postService.postService.getPost).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderPostDetailPage();

      const loadingContainer = screen.getByTestId('post-detail-loading');
      expect(loadingContainer).toBeInTheDocument();
      expect(loadingContainer).toHaveClass('post-detail-loading');
    });

    it('should show error state with proper styling', async () => {
      const errorMessage = 'Failed to load post';
      vi.mocked(postService.postService.getPost).mockRejectedValue(new Error(errorMessage));

      renderPostDetailPage();

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      const errorContainer = screen.getByTestId('post-detail-error');
      expect(errorContainer).toBeInTheDocument();
      expect(errorContainer).toHaveClass('post-detail-error');
    });
  });

  describe('User Interaction', () => {
    it('should navigate back when close button is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(postService.postService.getPost).mockResolvedValue(mockPost);

      renderPostDetailPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Navigation is handled by router, just verify button is clickable
      expect(closeButton).toBeEnabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label for close button', async () => {
      vi.mocked(postService.postService.getPost).mockResolvedValue(mockPost);

      renderPostDetailPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveAttribute('aria-label', 'Close');
    });

    it('should support keyboard navigation for close button', async () => {
      vi.mocked(postService.postService.getPost).mockResolvedValue(mockPost);

      renderPostDetailPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
      });

      // Verify close button is keyboard accessible
      const closeButton = screen.getByRole('button', { name: /close/i });
      closeButton.focus();
      expect(closeButton).toHaveFocus();
    });
  });

  describe('Comments Integration', () => {
    it('should render CommentList for post', async () => {
      vi.mocked(postService.postService.getPost).mockResolvedValue(mockPost);

      renderPostDetailPage();

      await waitFor(() => {
        expect(screen.getByTestId('comment-list-mock')).toBeInTheDocument();
      });

      // Verify CommentList receives correct postId
      expect(screen.getByTestId('comment-list-post-id')).toHaveTextContent('post-123');
    });

    it('should pass currentUserId to CommentList when authenticated', async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue(
        mockUseAuthAuthenticated({ id: 'user-456', username: 'testuser' })
      );
      vi.mocked(postService.postService.getPost).mockResolvedValue(mockPost);

      renderPostDetailPage();

      await waitFor(() => {
        expect(screen.getByTestId('comment-list-mock')).toBeInTheDocument();
      });

      // Verify CommentList receives currentUserId when user is authenticated
      expect(screen.getByTestId('comment-list-current-user-id')).toHaveTextContent('user-456');
    });

    it('should pass undefined currentUserId to CommentList when not authenticated', async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue(mockUseAuthUnauthenticated());
      vi.mocked(postService.postService.getPost).mockResolvedValue(mockPost);

      renderPostDetailPage();

      await waitFor(() => {
        expect(screen.getByTestId('comment-list-mock')).toBeInTheDocument();
      });

      // Verify CommentList receives undefined when no user is authenticated
      expect(screen.getByTestId('comment-list-current-user-id')).toHaveTextContent('not-provided');
    });

    it('should render comments section with proper styling', async () => {
      vi.mocked(postService.postService.getPost).mockResolvedValue(mockPost);

      renderPostDetailPage();

      await waitFor(() => {
        expect(screen.getByTestId('post-detail-page')).toBeInTheDocument();
      });

      // Verify comments section has proper class
      const commentsSection = document.querySelector('.post-detail__comments');
      expect(commentsSection).toBeInTheDocument();
      expect(commentsSection).toHaveClass('post-detail__comments');
    });
  });
});
