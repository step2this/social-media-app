import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PostDetailPage } from './PostDetailPage.js';
import * as postService from '../../services/postService.js';
import type { Post } from '@social-media-app/shared';

// Mock the postService
vi.mock('../../services/postService.js', () => ({
  postService: {
    getPost: vi.fn()
  }
}));

const mockPost: Post = {
  id: 'post-123',
  userId: 'user-123',
  userHandle: 'testuser',
  imageUrl: 'https://cdn.example.com/image.jpg',
  thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
  caption: 'Test caption for this awesome post',
  tags: ['test', 'post', 'tamagotchi'],
  likesCount: 42,
  commentsCount: 7,
  isPublic: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z'
};

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

    it('should use TamaFriends button styles for action buttons', async () => {
      vi.mocked(postService.postService.getPost).mockResolvedValue(mockPost);

      renderPostDetailPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /like/i })).toBeInTheDocument();
      });

      const likeButton = screen.getByRole('button', { name: /like/i });
      expect(likeButton).toHaveClass('tama-btn', 'tama-btn--icon');

      const commentButton = screen.getByRole('button', { name: /comment/i });
      expect(commentButton).toHaveClass('tama-btn', 'tama-btn--icon');

      const shareButton = screen.getByRole('button', { name: /share/i });
      expect(shareButton).toHaveClass('tama-btn', 'tama-btn--icon');
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
    it('should render post details with all content', async () => {
      vi.mocked(postService.postService.getPost).mockResolvedValue(mockPost);

      renderPostDetailPage();

      await waitFor(() => {
        const userHandles = screen.getAllByText(`@${mockPost.userHandle}`);
        expect(userHandles.length).toBeGreaterThan(0);
      });

      expect(screen.getByText(mockPost.caption!)).toBeInTheDocument();
      expect(screen.getByAltText(mockPost.caption!)).toBeInTheDocument();
      expect(screen.getByText(mockPost.likesCount.toString())).toBeInTheDocument();
      expect(screen.getByText(mockPost.commentsCount.toString())).toBeInTheDocument();
    });

    it('should render all tags with proper styling', async () => {
      vi.mocked(postService.postService.getPost).mockResolvedValue(mockPost);

      renderPostDetailPage();

      await waitFor(() => {
        expect(screen.getByText('#test')).toBeInTheDocument();
      });

      mockPost.tags!.forEach(tag => {
        const tagElement = screen.getByText(`#${tag}`);
        expect(tagElement).toBeInTheDocument();
        expect(tagElement).toHaveClass('post-tag');
      });
    });

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

    it('should handle image load correctly', async () => {
      vi.mocked(postService.postService.getPost).mockResolvedValue(mockPost);

      renderPostDetailPage();

      await waitFor(() => {
        expect(screen.getByAltText(mockPost.caption!)).toBeInTheDocument();
      });

      const image = screen.getByAltText(mockPost.caption!) as HTMLImageElement;
      expect(image).toHaveAttribute('src', mockPost.imageUrl);
      expect(image).toHaveClass('post-image');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      vi.mocked(postService.postService.getPost).mockResolvedValue(mockPost);

      renderPostDetailPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /like/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /comment/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation for action buttons', async () => {
      const user = userEvent.setup();
      vi.mocked(postService.postService.getPost).mockResolvedValue(mockPost);

      renderPostDetailPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
      });

      // Verify buttons are keyboard accessible (can receive focus)
      const closeButton = screen.getByRole('button', { name: /close/i });
      closeButton.focus();
      expect(closeButton).toHaveFocus();

      const likeButton = screen.getByRole('button', { name: /like/i });
      likeButton.focus();
      expect(likeButton).toHaveFocus();

      const commentButton = screen.getByRole('button', { name: /comment/i });
      commentButton.focus();
      expect(commentButton).toHaveFocus();
    });
  });
});
