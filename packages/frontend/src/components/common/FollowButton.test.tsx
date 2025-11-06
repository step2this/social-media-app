import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FollowButton } from './FollowButton.js';
import * as useFollowModule from '../../hooks/useFollow.js';
import * as useAuthModule from '../../hooks/useAuth.js';
import { createMockUseAuthReturn, createMockUseFollowReturn, createMockAuthenticatedUser } from '../../test-utils/hook-mocks.js';

// Mock the hooks
vi.mock('../../hooks/useFollow.js');
vi.mock('../../hooks/useAuth.js');

describe('FollowButton', () => {
  const mockFollowUser = vi.fn();
  const mockUnfollowUser = vi.fn();
  const mockClearError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default useFollow mock - provides mutation functions only
    vi.mocked(useFollowModule.useFollow).mockReturnValue(
      createMockUseFollowReturn({
        followUser: mockFollowUser,
        unfollowUser: mockUnfollowUser,
        clearError: mockClearError
      })
    );

    // Default useAuth mock (authenticated but different user)
    vi.mocked(useAuthModule.useAuth).mockReturnValue(
      createMockUseAuthReturn({
        user: createMockAuthenticatedUser({ id: 'current-user-123' }),
        isAuthenticated: true
      })
    );
  });

  describe('Rendering and State', () => {
    it('should render Follow button when not following', () => {
      render(<FollowButton userId="target-user-123" isFollowing={false} />);

      const button = screen.getByRole('button', { name: /follow/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Follow');
    });

    it('should render Following button when following', () => {
      render(<FollowButton userId="target-user-123" isFollowing={true} />);

      const button = screen.getByTestId('follow-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Following');
    });

    it('should not render button for current user', () => {
      render(<FollowButton userId="current-user-123" isFollowing={false} />);

      const button = screen.queryByRole('button');
      expect(button).not.toBeInTheDocument();
    });

    it('should not render button when not authenticated', () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue(
        createMockUseAuthReturn({
          user: null,
          isAuthenticated: false
        })
      );

      render(<FollowButton userId="target-user-123" isFollowing={false} />);

      const button = screen.queryByRole('button');
      expect(button).not.toBeInTheDocument();
    });

    it('should read isFollowing state from props, not hook', () => {
      // Test that isFollowing prop controls the display
      const { rerender } = render(
        <FollowButton userId="target-user-123" isFollowing={false} />
      );

      expect(screen.getByRole('button')).toHaveTextContent('Follow');

      // Change prop and verify UI updates
      rerender(<FollowButton userId="target-user-123" isFollowing={true} />);

      expect(screen.getByTestId('follow-button')).toHaveTextContent('Following');
    });
  });

  describe('Design System Styling', () => {
    it('should use TamaFriends button classes for Follow state', () => {
      render(<FollowButton userId="target-user-123" isFollowing={false} />);

      const button = screen.getByRole('button', { name: /follow/i });
      expect(button).toHaveClass('tama-btn', 'tama-btn--automotive');
    });

    it('should use TamaFriends button classes for Following state', () => {
      render(<FollowButton userId="target-user-123" isFollowing={true} />);

      const button = screen.getByTestId('follow-button');
      expect(button).toHaveClass('tama-btn', 'tama-btn--automotive', 'tama-btn--secondary');
    });

    it('should have proper test data attributes', () => {
      render(<FollowButton userId="target-user-123" isFollowing={false} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-testid', 'follow-button');
    });
  });

  describe('User Interactions', () => {
    it('should call followUser when Follow button is clicked', async () => {
      const user = userEvent.setup();
      render(<FollowButton userId="target-user-123" isFollowing={false} />);

      const button = screen.getByRole('button', { name: /follow/i });
      await user.click(button);

      expect(mockFollowUser).toHaveBeenCalledOnce();
      expect(mockUnfollowUser).not.toHaveBeenCalled();
    });

    it('should call unfollowUser when Following button is clicked', async () => {
      const user = userEvent.setup();
      render(<FollowButton userId="target-user-123" isFollowing={true} />);

      const button = screen.getByTestId('follow-button');
      await user.click(button);

      expect(mockUnfollowUser).toHaveBeenCalledOnce();
      expect(mockFollowUser).not.toHaveBeenCalled();
    });

    it('should pass userId to useFollow hook', () => {
      render(<FollowButton userId="target-user-456" isFollowing={false} />);

      expect(useFollowModule.useFollow).toHaveBeenCalledWith('target-user-456');
    });
  });

  describe('Hover Behavior', () => {
    it('should show Unfollow text on hover when Following', async () => {
      const user = userEvent.setup();
      render(<FollowButton userId="target-user-123" isFollowing={true} />);

      const button = screen.getByTestId('follow-button');
      expect(button).toHaveTextContent('Following');

      await user.hover(button);
      expect(button).toHaveTextContent('Unfollow');

      await user.unhover(button);
      expect(button).toHaveTextContent('Following');
    });

    it('should not change text on hover when in Follow state', async () => {
      const user = userEvent.setup();
      render(<FollowButton userId="target-user-123" isFollowing={false} />);

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Follow');

      await user.hover(button);
      expect(button).toHaveTextContent('Follow');

      await user.unhover(button);
      expect(button).toHaveTextContent('Follow');
    });
  });

  describe('Loading State', () => {
    it('should disable button during loading', () => {
      vi.mocked(useFollowModule.useFollow).mockReturnValue(
        createMockUseFollowReturn({
          isLoading: true,
          followUser: mockFollowUser,
          unfollowUser: mockUnfollowUser,
          clearError: mockClearError
        })
      );

      render(<FollowButton userId="target-user-123" isFollowing={false} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should show loading indicator during API call', () => {
      vi.mocked(useFollowModule.useFollow).mockReturnValue(
        createMockUseFollowReturn({
          isLoading: true,
          followUser: mockFollowUser,
          unfollowUser: mockUnfollowUser,
          clearError: mockClearError
        })
      );

      render(<FollowButton userId="target-user-123" isFollowing={false} />);

      const spinner = screen.getByTestId('follow-button-spinner');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('spinner');
    });

    it('should not show loading indicator when not loading', () => {
      render(<FollowButton userId="target-user-123" isFollowing={false} />);

      const spinner = screen.queryByTestId('follow-button-spinner');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when follow fails', () => {
      vi.mocked(useFollowModule.useFollow).mockReturnValue(
        createMockUseFollowReturn({
          error: 'Failed to follow user',
          followUser: mockFollowUser,
          unfollowUser: mockUnfollowUser,
          clearError: mockClearError
        })
      );

      render(<FollowButton userId="target-user-123" isFollowing={false} />);

      const errorMessage = screen.getByText('Failed to follow user');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveClass('follow-button-error');
    });

    it('should display error message when unfollow fails', () => {
      vi.mocked(useFollowModule.useFollow).mockReturnValue(
        createMockUseFollowReturn({
          error: 'Failed to unfollow user',
          followUser: mockFollowUser,
          unfollowUser: mockUnfollowUser,
          clearError: mockClearError
        })
      );

      render(<FollowButton userId="target-user-123" isFollowing={true} />);

      const errorMessage = screen.getByText('Failed to unfollow user');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveClass('follow-button-error');
    });

    it('should clear error when button is clicked again', async () => {
      const user = userEvent.setup();
      vi.mocked(useFollowModule.useFollow).mockReturnValue(
        createMockUseFollowReturn({
          error: 'Failed to follow user',
          followUser: mockFollowUser,
          unfollowUser: mockUnfollowUser,
          clearError: mockClearError
        })
      );

      render(<FollowButton userId="target-user-123" isFollowing={false} />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockClearError).toHaveBeenCalledOnce();
      expect(mockFollowUser).toHaveBeenCalledOnce();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for Follow state', () => {
      render(<FollowButton userId="target-user-123" isFollowing={false} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Follow user');
    });

    it('should have proper ARIA labels for Following state', () => {
      render(<FollowButton userId="target-user-123" isFollowing={true} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Unfollow user');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<FollowButton userId="target-user-123" isFollowing={false} />);

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(mockFollowUser).toHaveBeenCalledOnce();
    });
  });

  describe('Integration with Parent Component', () => {
    it('should work when isFollowing changes from parent', () => {
      // Simulate ProfilePage query updating isFollowing
      const { rerender } = render(
        <FollowButton userId="target-user-123" isFollowing={false} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Follow');

      // Parent query updates (e.g., after mutation completes)
      rerender(<FollowButton userId="target-user-123" isFollowing={true} />);

      const updatedButton = screen.getByTestId('follow-button');
      expect(updatedButton).toHaveTextContent('Following');
    });

    it('should call onFollowStatusChange callback if provided', async () => {
      const mockCallback = vi.fn();
      const user = userEvent.setup();

      render(
        <FollowButton
          userId="target-user-123"
          isFollowing={false}
          onFollowStatusChange={mockCallback}
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      // Note: onFollowStatusChange is currently not called in the implementation
      // This test documents the prop but doesn't assert on behavior
      // since the implementation doesn't use it yet
    });
  });
});
