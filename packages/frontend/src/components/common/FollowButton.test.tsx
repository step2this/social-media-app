import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FollowButton } from './FollowButton.js';
import * as useFollowModule from '../../hooks/useFollow.js';
import * as useAuthModule from '../../hooks/useAuth.js';

// Mock the hooks
vi.mock('../../hooks/useFollow.js');
vi.mock('../../hooks/useAuth.js');

describe('FollowButton', () => {
  const mockFollowUser = vi.fn();
  const mockUnfollowUser = vi.fn();
  const mockToggleFollow = vi.fn();
  const mockFetchFollowStatus = vi.fn();
  const mockClearError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default useFollow mock
    vi.mocked(useFollowModule.useFollow).mockReturnValue({
      isFollowing: false,
      followersCount: 0,
      followingCount: 0,
      isLoading: false,
      error: null,
      followUser: mockFollowUser,
      unfollowUser: mockUnfollowUser,
      toggleFollow: mockToggleFollow,
      fetchFollowStatus: mockFetchFollowStatus,
      clearError: mockClearError
    });

    // Default useAuth mock (authenticated but different user)
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: {
        id: 'current-user-123',
        email: 'current@example.com',
        username: 'currentuser',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      },
      tokens: null,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      isHydrated: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      getProfile: vi.fn(),
      updateProfile: vi.fn(),
      checkSession: vi.fn(),
      clearError: vi.fn()
    });
  });

  describe('Rendering and State', () => {
    it('should render Follow button when not following', () => {
      render(<FollowButton userId="target-user-123" />);

      const button = screen.getByRole('button', { name: /follow/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Follow');
    });

    it('should render Following button when following', () => {
      vi.mocked(useFollowModule.useFollow).mockReturnValue({
        isFollowing: true,
        followersCount: 1,
        followingCount: 0,
        isLoading: false,
        error: null,
        followUser: mockFollowUser,
        unfollowUser: mockUnfollowUser,
        toggleFollow: mockToggleFollow,
        fetchFollowStatus: mockFetchFollowStatus,
        clearError: mockClearError
      });

      render(<FollowButton userId="target-user-123" />);

      const button = screen.getByTestId('follow-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Following');
    });

    it('should not render button for current user', () => {
      render(<FollowButton userId="current-user-123" />);

      const button = screen.queryByRole('button');
      expect(button).not.toBeInTheDocument();
    });

    it('should not render button when not authenticated', () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        isHydrated: true,
        register: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        getProfile: vi.fn(),
        updateProfile: vi.fn(),
        checkSession: vi.fn(),
        clearError: vi.fn()
      });

      render(<FollowButton userId="target-user-123" />);

      const button = screen.queryByRole('button');
      expect(button).not.toBeInTheDocument();
    });
  });

  describe('Design System Styling', () => {
    it('should use TamaFriends button classes for Follow state', () => {
      render(<FollowButton userId="target-user-123" />);

      const button = screen.getByRole('button', { name: /follow/i });
      expect(button).toHaveClass('tama-btn', 'tama-btn--automotive');
    });

    it('should use TamaFriends button classes for Following state', () => {
      vi.mocked(useFollowModule.useFollow).mockReturnValue({
        isFollowing: true,
        followersCount: 1,
        followingCount: 0,
        isLoading: false,
        error: null,
        followUser: mockFollowUser,
        unfollowUser: mockUnfollowUser,
        toggleFollow: mockToggleFollow,
        fetchFollowStatus: mockFetchFollowStatus,
        clearError: mockClearError
      });

      render(<FollowButton userId="target-user-123" />);

      const button = screen.getByTestId('follow-button');
      expect(button).toHaveClass('tama-btn', 'tama-btn--automotive', 'tama-btn--secondary');
    });

    it('should have proper test data attributes', () => {
      render(<FollowButton userId="target-user-123" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-testid', 'follow-button');
    });
  });

  describe('User Interactions', () => {
    it('should call followUser when Follow button is clicked', async () => {
      const user = userEvent.setup();
      render(<FollowButton userId="target-user-123" />);

      const button = screen.getByRole('button', { name: /follow/i });
      await user.click(button);

      expect(mockFollowUser).toHaveBeenCalledOnce();
    });

    it('should call unfollowUser when Following button is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(useFollowModule.useFollow).mockReturnValue({
        isFollowing: true,
        followersCount: 1,
        followingCount: 0,
        isLoading: false,
        error: null,
        followUser: mockFollowUser,
        unfollowUser: mockUnfollowUser,
        toggleFollow: mockToggleFollow,
        fetchFollowStatus: mockFetchFollowStatus,
        clearError: mockClearError
      });

      render(<FollowButton userId="target-user-123" />);

      const button = screen.getByTestId('follow-button');
      await user.click(button);

      expect(mockUnfollowUser).toHaveBeenCalledOnce();
    });
  });

  describe('Hover Behavior', () => {
    it('should show Unfollow text on hover when Following', async () => {
      const user = userEvent.setup();
      vi.mocked(useFollowModule.useFollow).mockReturnValue({
        isFollowing: true,
        followersCount: 1,
        followingCount: 0,
        isLoading: false,
        error: null,
        followUser: mockFollowUser,
        unfollowUser: mockUnfollowUser,
        toggleFollow: mockToggleFollow,
        fetchFollowStatus: mockFetchFollowStatus,
        clearError: mockClearError
      });

      render(<FollowButton userId="target-user-123" />);

      const button = screen.getByTestId('follow-button');
      expect(button).toHaveTextContent('Following');

      await user.hover(button);
      expect(button).toHaveTextContent('Unfollow');

      await user.unhover(button);
      expect(button).toHaveTextContent('Following');
    });
  });

  describe('Loading State', () => {
    it('should disable button during loading', () => {
      vi.mocked(useFollowModule.useFollow).mockReturnValue({
        isFollowing: false,
        followersCount: 0,
        followingCount: 0,
        isLoading: true,
        error: null,
        followUser: mockFollowUser,
        unfollowUser: mockUnfollowUser,
        toggleFollow: mockToggleFollow,
        fetchFollowStatus: mockFetchFollowStatus,
        clearError: mockClearError
      });

      render(<FollowButton userId="target-user-123" />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should show loading indicator during API call', () => {
      vi.mocked(useFollowModule.useFollow).mockReturnValue({
        isFollowing: false,
        followersCount: 0,
        followingCount: 0,
        isLoading: true,
        error: null,
        followUser: mockFollowUser,
        unfollowUser: mockUnfollowUser,
        toggleFollow: mockToggleFollow,
        fetchFollowStatus: mockFetchFollowStatus,
        clearError: mockClearError
      });

      render(<FollowButton userId="target-user-123" />);

      const spinner = screen.getByTestId('follow-button-spinner');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('spinner');
    });

    it('should not show loading indicator when not loading', () => {
      render(<FollowButton userId="target-user-123" />);

      const spinner = screen.queryByTestId('follow-button-spinner');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when follow fails', () => {
      vi.mocked(useFollowModule.useFollow).mockReturnValue({
        isFollowing: false,
        followersCount: 0,
        followingCount: 0,
        isLoading: false,
        error: 'Failed to follow user',
        followUser: mockFollowUser,
        unfollowUser: mockUnfollowUser,
        toggleFollow: mockToggleFollow,
        fetchFollowStatus: mockFetchFollowStatus,
        clearError: mockClearError
      });

      render(<FollowButton userId="target-user-123" />);

      const errorMessage = screen.getByText('Failed to follow user');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveClass('follow-button-error');
    });

    it('should display error message when unfollow fails', () => {
      vi.mocked(useFollowModule.useFollow).mockReturnValue({
        isFollowing: true,
        followersCount: 1,
        followingCount: 0,
        isLoading: false,
        error: 'Failed to unfollow user',
        followUser: mockFollowUser,
        unfollowUser: mockUnfollowUser,
        toggleFollow: mockToggleFollow,
        fetchFollowStatus: mockFetchFollowStatus,
        clearError: mockClearError
      });

      render(<FollowButton userId="target-user-123" />);

      const errorMessage = screen.getByText('Failed to unfollow user');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveClass('follow-button-error');
    });

    it('should clear error when button is clicked again', async () => {
      const user = userEvent.setup();
      vi.mocked(useFollowModule.useFollow).mockReturnValue({
        isFollowing: false,
        followersCount: 0,
        followingCount: 0,
        isLoading: false,
        error: 'Failed to follow user',
        followUser: mockFollowUser,
        unfollowUser: mockUnfollowUser,
        toggleFollow: mockToggleFollow,
        fetchFollowStatus: mockFetchFollowStatus,
        clearError: mockClearError
      });

      render(<FollowButton userId="target-user-123" />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockClearError).toHaveBeenCalledOnce();
      expect(mockFollowUser).toHaveBeenCalledOnce();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for Follow state', () => {
      render(<FollowButton userId="target-user-123" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Follow user');
    });

    it('should have proper ARIA labels for Following state', () => {
      vi.mocked(useFollowModule.useFollow).mockReturnValue({
        isFollowing: true,
        followersCount: 1,
        followingCount: 0,
        isLoading: false,
        error: null,
        followUser: mockFollowUser,
        unfollowUser: mockUnfollowUser,
        toggleFollow: mockToggleFollow,
        fetchFollowStatus: mockFetchFollowStatus,
        clearError: mockClearError
      });

      render(<FollowButton userId="target-user-123" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Unfollow user');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<FollowButton userId="target-user-123" />);

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(mockFollowUser).toHaveBeenCalledOnce();
    });
  });

  describe('Initial State Options', () => {
    it('should support initialIsFollowing option', () => {
      render(
        <FollowButton
          userId="target-user-123"
          initialIsFollowing={true}
          initialFollowersCount={100}
        />
      );

      expect(useFollowModule.useFollow).toHaveBeenCalledWith('target-user-123', {
        initialIsFollowing: true,
        initialFollowersCount: 100,
        initialFollowingCount: undefined
      });
    });

    it('should pass through all initial options to useFollow', () => {
      render(
        <FollowButton
          userId="target-user-123"
          initialIsFollowing={true}
          initialFollowersCount={200}
          initialFollowingCount={50}
        />
      );

      expect(useFollowModule.useFollow).toHaveBeenCalledWith('target-user-123', {
        initialIsFollowing: true,
        initialFollowersCount: 200,
        initialFollowingCount: 50
      });
    });
  });
});
