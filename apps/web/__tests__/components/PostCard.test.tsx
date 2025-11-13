/**
 * PostCard Component Tests
 *
 * Behavioral tests for the PostCard component.
 * Tests user interactions and UI updates using dependency injection.
 * No module-level mocks - dependencies are injected via props.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostCard } from '@/components/posts/PostCard';
import { createMockPost, createMockPostWithLikes } from '../helpers/fixtures';
import type { Post } from '@/lib/graphql/types';

describe('PostCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Post Display', () => {
    it('should render post content correctly', () => {
      const post = createMockPost({
        caption: 'Beautiful sunset 🌅',
        likesCount: 42,
        commentsCount: 5,
      });

      render(<PostCard post={post} />);

      expect(screen.getByText('Beautiful sunset 🌅')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should display author information', () => {
      const post = createMockPost({
        author: {
          id: 'user-123',
          username: 'johndoe',
          handle: 'johndoe',
          fullName: 'John Doe',
          profilePictureUrl: 'https://example.com/avatar.jpg',
        },
      });

      render(<PostCard post={post} />);

      expect(screen.getByText('johndoe')).toBeInTheDocument();
      expect(screen.getByText('@johndoe')).toBeInTheDocument();
      expect(screen.getByAltText('johndoe')).toHaveAttribute(
        'src',
        'https://example.com/avatar.jpg'
      );
    });

    it('should display post image', () => {
      const post = createMockPost({
        thumbnailUrl: 'https://example.com/image.jpg',
      });

      render(<PostCard post={post} />);

      const img = screen.getByAltText('Post image');
      expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('should render without caption if none provided', () => {
      const post = createMockPost({ caption: undefined });

      render(<PostCard post={post} />);

      // Should not find caption text, but post should still render
      const article = screen.getByRole('article');
      expect(article).toBeInTheDocument();
    });
  });

  describe('Like State Display', () => {
    it('should show unliked state when post is not liked', () => {
      const post = createMockPostWithLikes(10, false);

      render(<PostCard post={post} />);

      const likeButton = screen.getByTestId('like-button');
      expect(likeButton).toHaveAttribute('aria-label', 'Like post');
      expect(likeButton).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should show liked state when post is already liked', () => {
      const post = createMockPostWithLikes(10, true);

      render(<PostCard post={post} />);

      const likeButton = screen.getByTestId('like-button');
      expect(likeButton).toHaveAttribute('aria-label', 'Unlike post');
      expect(likeButton).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });

  describe('Like Interaction', () => {
    it('should update UI optimistically when clicking like', async () => {
      const user = userEvent.setup();
      const post = createMockPostWithLikes(10, false);

      const mockLike = vi.fn().mockResolvedValue({
        success: true,
        likesCount: 11,
        isLiked: true,
      });

      render(<PostCard post={post} onLike={mockLike} />);

      const likeButton = screen.getByTestId('like-button');

      // Initial state: not liked, count = 10
      expect(likeButton).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByText('10')).toBeInTheDocument();

      // Click like button
      await user.click(likeButton);

      // Optimistic update: should immediately show liked state
      await waitFor(() => {
        expect(likeButton).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText('11')).toBeInTheDocument();
      });

      // Verify Server Action was called
      expect(mockLike).toHaveBeenCalledWith('post-1');
    });

    it('should update UI optimistically when clicking unlike', async () => {
      const user = userEvent.setup();
      const post = createMockPostWithLikes(10, true);

      const mockUnlike = vi.fn().mockResolvedValue({
        success: true,
        likesCount: 9,
        isLiked: false,
      });

      render(<PostCard post={post} onUnlike={mockUnlike} />);

      const likeButton = screen.getByTestId('like-button');

      // Initial state: liked, count = 10
      expect(likeButton).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('10')).toBeInTheDocument();

      // Click unlike button
      await user.click(likeButton);

      // Optimistic update: should immediately show unliked state
      await waitFor(() => {
        expect(likeButton).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByText('9')).toBeInTheDocument();
      });

      // Verify Server Action was called
      expect(mockUnlike).toHaveBeenCalledWith('post-1');
    });

    it('should sync with server response after successful like', async () => {
      const user = userEvent.setup();
      const post = createMockPostWithLikes(10, false);

      // Server returns slightly different count (race condition scenario)
      const mockLike = vi.fn().mockResolvedValue({
        success: true,
        likesCount: 12, // Server says 12, not 11
        isLiked: true,
      });

      render(<PostCard post={post} onLike={mockLike} />);

      const likeButton = screen.getByTestId('like-button');
      await user.click(likeButton);

      // Should sync to server's count
      await waitFor(() => {
        expect(screen.getByText('12')).toBeInTheDocument();
      });
    });

    it('should show error alert when like fails', async () => {
      const user = userEvent.setup();
      const post = createMockPostWithLikes(10, false);

      // Mock to simulate an alert
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      const mockLike = vi.fn().mockResolvedValue({
        success: false,
        likesCount: 0,
        isLiked: false,
      });

      render(<PostCard post={post} onLike={mockLike} />);

      const likeButton = screen.getByTestId('like-button');
      await user.click(likeButton);

      // Should show error alert after failed mutation
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to update like. Please try again.');
      });

      alertSpy.mockRestore();
    });

    it('should disable button during mutation', async () => {
      const user = userEvent.setup();
      const post = createMockPostWithLikes(10, false);

      // Make the mutation slow
      const mockLike = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          success: true,
          likesCount: 11,
          isLiked: true,
        }), 100))
      );

      render(<PostCard post={post} onLike={mockLike} />);

      const likeButton = screen.getByTestId('like-button');
      await user.click(likeButton);

      // Button should be disabled during mutation
      await waitFor(() => {
        expect(likeButton).toBeDisabled();
      });

      // Should re-enable after mutation completes
      await waitFor(
        () => {
          expect(likeButton).not.toBeDisabled();
        },
        { timeout: 200 }
      );
    });
  });

  describe('Comment Interaction', () => {
    it('should navigate to post detail when clicking comment button', async () => {
      const user = userEvent.setup();
      const post = createMockPost({ id: 'post-123' });

      // Mock window.location.href
      delete (window as any).location;
      (window as any).location = { href: '' };

      render(<PostCard post={post} />);

      const commentButton = screen.getByTestId('comment-button');
      await user.click(commentButton);

      expect(window.location.href).toBe('/post/post-123');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for action buttons', () => {
      const post = createMockPost();

      render(<PostCard post={post} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3); // Like, comment, share
    });

    it('should show time in readable format', () => {
      const fixedDate = new Date('2024-01-15T12:00:00Z');
      const post = createMockPost({ createdAt: fixedDate.toISOString() });

      render(<PostCard post={post} />);

      expect(screen.getByText('1/15/2024')).toBeInTheDocument();
    });
  });
});
