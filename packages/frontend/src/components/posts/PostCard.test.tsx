import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { PostCard } from './PostCard';
import type { Post } from '@social-media-app/shared';
import { renderWithRouter } from '../../test-utils/render-helpers';
import { createMockPost } from '../../test-utils/mock-factories';

// Mock the hooks and components
vi.mock('../../hooks/useLike', () => ({
  useLike: vi.fn((postId, options) => ({
    isLiked: options?.initialIsLiked || false,
    likesCount: options?.initialLikesCount || 0,
    isLoading: false,
    toggleLike: vi.fn(),
    error: null,
    clearError: vi.fn()
  }))
}));

vi.mock('../common/UserLink', () => ({
  UserLink: ({ username }: { username: string }) => <span data-testid="user-link">{username}</span>
}));

vi.mock('../common/FollowButton', () => ({
  FollowButton: ({ userId }: { userId: string }) => (
    <button data-testid="follow-button">Follow</button>
  )
}));

vi.mock('../common/MaterialIcon', () => ({
  MaterialIcon: ({ name, variant }: { name: string; variant?: string }) => (
    <span data-testid={`material-icon-${name}`}>{name}-{variant || 'default'}</span>
  )
}));

describe('PostCard', () => {
  const mockPost = createMockPost({
    id: 'post-123',
    userId: 'user-123',
    userHandle: 'testuser',
    caption: 'Test caption for post',
    tags: ['test', 'vitest'],
    imageUrl: 'https://example.com/image.jpg',
    likesCount: 42,
    commentsCount: 5,
    createdAt: '2025-10-09T10:00:00Z',
    updatedAt: '2025-10-09T10:00:00Z'
  }) as Post & { isLiked?: boolean };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render post image', () => {
      renderWithRouter(<PostCard post={mockPost} />);

      const image = screen.getByRole('img', { name: /test caption/i });
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', mockPost.imageUrl);
    });

    it('should render user handle with UserLink', () => {
      renderWithRouter(<PostCard post={mockPost} />);

      const userLink = screen.getByTestId('user-link');
      expect(userLink).toBeInTheDocument();
      expect(userLink).toHaveTextContent('testuser');
    });

    it('should render caption', () => {
      renderWithRouter(<PostCard post={mockPost} />);

      expect(screen.getByText('Test caption for post')).toBeInTheDocument();
    });

    it('should render tags', () => {
      renderWithRouter(<PostCard post={mockPost} />);

      expect(screen.getByText('#test')).toBeInTheDocument();
      expect(screen.getByText('#vitest')).toBeInTheDocument();
    });

    it('should render timestamp', () => {
      renderWithRouter(<PostCard post={mockPost} />);

      // Check for date string (format may vary by locale)
      const timestamp = screen.getByText(/2025/);
      expect(timestamp).toBeInTheDocument();
    });

    it('should render like button', () => {
      renderWithRouter(<PostCard post={mockPost} />);

      const likeButton = screen.getByRole('button', { name: /like/i });
      expect(likeButton).toBeInTheDocument();
    });

    it('should render like count', () => {
      renderWithRouter(<PostCard post={mockPost} />);

      expect(screen.getByTestId('like-count')).toHaveTextContent('42');
    });

    it('should render comment count', () => {
      renderWithRouter(<PostCard post={mockPost} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should render FollowButton when viewing another user\'s post', () => {
      renderWithRouter(<PostCard post={mockPost} currentUserId="different-user" />);

      expect(screen.getByTestId('follow-button')).toBeInTheDocument();
    });

    it('should NOT render FollowButton when viewing own post', () => {
      renderWithRouter(<PostCard post={mockPost} currentUserId="user-123" />);

      expect(screen.queryByTestId('follow-button')).not.toBeInTheDocument();
    });
  });

  describe('Optional Fields', () => {
    it('should handle missing caption', () => {
      const postWithoutCaption = createMockPost({
        caption: undefined
      });
      renderWithRouter(<PostCard post={postWithoutCaption} />);

      expect(screen.queryByText('Test caption')).not.toBeInTheDocument();
    });

    it('should handle missing tags', () => {
      const postWithoutTags = createMockPost({
        tags: []
      });
      renderWithRouter(<PostCard post={postWithoutTags} />);

      expect(screen.queryByText(/#/)).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show image loading skeleton before image loads', () => {
      renderWithRouter(<PostCard post={mockPost} />);

      // Component should handle image loading state
      const image = screen.getByRole('img');
      expect(image).toHaveClass('loading');
    });
  });

  describe('Layout Variants', () => {
    it('should render with default feed variant', () => {
      renderWithRouter(<PostCard post={mockPost} />);

      const card = screen.getByTestId('post-card');
      expect(card).toHaveClass('post-card');
      expect(card).not.toHaveClass('post-card--detail');
    });

    it('should render with detail variant when specified', () => {
      renderWithRouter(<PostCard post={mockPost} variant="detail" />);

      const card = screen.getByTestId('post-card');
      expect(card).toHaveClass('post-card');
      expect(card).toHaveClass('post-card--detail');
    });

    it('should render with feed variant when explicitly specified', () => {
      renderWithRouter(<PostCard post={mockPost} variant="feed" />);

      const card = screen.getByTestId('post-card');
      expect(card).toHaveClass('post-card');
      expect(card).not.toHaveClass('post-card--detail');
    });
  });
});
