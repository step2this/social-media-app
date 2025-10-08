import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProfileHoverCard } from './ProfileHoverCard.js';
import * as profileService from '../../services/profileService.js';

// Mock the profile service
vi.mock('../../services/profileService.js', () => ({
  profileService: {
    getProfileByHandle: vi.fn(),
    getPublicProfile: vi.fn()
  }
}));

// Mock hooks
vi.mock('../../hooks/useFollow.js', () => ({
  useFollow: vi.fn(() => ({
    isFollowing: false,
    followersCount: 100,
    followingCount: 50,
    isLoading: false,
    error: null,
    followUser: vi.fn(),
    unfollowUser: vi.fn(),
    toggleFollow: vi.fn(),
    fetchFollowStatus: vi.fn(),
    clearError: vi.fn()
  }))
}));

vi.mock('../../hooks/useAuth.js', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'current-user', email: 'current@example.com', username: 'currentuser', emailVerified: true, createdAt: '', updatedAt: '' },
    isAuthenticated: true,
    isLoading: false,
    error: null,
    isHydrated: true,
    tokens: null,
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    checkSession: vi.fn(),
    clearError: vi.fn()
  }))
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

const mockProfile = {
  id: 'user-123',
  handle: 'testuser',
  username: 'testuser',
  fullName: 'Test User',
  bio: 'Software developer passionate about clean code',
  profilePictureUrl: 'https://example.com/avatar.jpg',
  profilePictureThumbnailUrl: 'https://example.com/avatar-thumb.jpg',
  postsCount: 42,
  followersCount: 150,
  followingCount: 75,
  createdAt: '2024-01-15T10:30:00.000Z'
};

describe('ProfileHoverCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(profileService.profileService.getProfileByHandle).mockResolvedValue(mockProfile);
  });

  describe('Visibility and Positioning', () => {
    it('should not render when isVisible is false', () => {
      renderWithRouter(
        <ProfileHoverCard userId="user-123" userHandle="testuser" isVisible={false} position={{ x: 0, y: 0 }} />
      );

      const card = screen.queryByTestId('profile-hover-card');
      expect(card).not.toBeInTheDocument();
    });

    it('should render when isVisible is true', async () => {
      renderWithRouter(
        <ProfileHoverCard userId="user-123" userHandle="testuser" isVisible={true} position={{ x: 100, y: 100 }} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('profile-hover-card')).toBeInTheDocument();
      });
    });

    it('should position card at specified coordinates', async () => {
      renderWithRouter(
        <ProfileHoverCard userId="user-123" userHandle="testuser" isVisible={true} position={{ x: 150, y: 200 }} />
      );

      await waitFor(() => {
        const card = screen.getByTestId('profile-hover-card');
        expect(card).toHaveStyle({ left: '150px', top: '200px' });
      });
    });

    it('should support custom positioning offset', async () => {
      renderWithRouter(
        <ProfileHoverCard
          userId="user-123"
          userHandle="testuser"
          isVisible={true}
          position={{ x: 100, y: 100 }}
          offset={{ x: 10, y: 20 }}
        />
      );

      await waitFor(() => {
        const card = screen.getByTestId('profile-hover-card');
        expect(card).toHaveStyle({ left: '110px', top: '120px' });
      });
    });
  });

  describe('Data Loading', () => {
    it('should fetch profile data on mount when visible', async () => {
      renderWithRouter(
        <ProfileHoverCard userId="user-123" userHandle="testuser" isVisible={true} position={{ x: 0, y: 0 }} />
      );

      await waitFor(() => {
        expect(profileService.profileService.getProfileByHandle).toHaveBeenCalledWith('testuser');
      });
    });

    it('should show loading state while fetching', () => {
      vi.mocked(profileService.profileService.getProfileByHandle).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithRouter(
        <ProfileHoverCard userId="user-123" userHandle="testuser" isVisible={true} position={{ x: 0, y: 0 }} />
      );

      expect(screen.getByTestId('profile-hover-card-loading')).toBeInTheDocument();
    });

    it('should display profile data after loading', async () => {
      renderWithRouter(
        <ProfileHoverCard userId="user-123" userHandle="testuser" isVisible={true} position={{ x: 0, y: 0 }} />
      );

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('@testuser')).toBeInTheDocument();
        expect(screen.getByText(/Software developer/)).toBeInTheDocument();
      });
    });

    it('should handle fetch errors gracefully', async () => {
      vi.mocked(profileService.profileService.getProfileByHandle).mockRejectedValue(
        new Error('Failed to load profile')
      );

      renderWithRouter(
        <ProfileHoverCard userId="user-123" userHandle="testuser" isVisible={true} position={{ x: 0, y: 0 }} />
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to load profile/i)).toBeInTheDocument();
      });
    });
  });

  describe('Profile Display', () => {
    it('should display avatar', async () => {
      renderWithRouter(
        <ProfileHoverCard userId="user-123" userHandle="testuser" isVisible={true} position={{ x: 0, y: 0 }} />
      );

      await waitFor(() => {
        const avatar = screen.getByAltText('Test User');
        expect(avatar).toBeInTheDocument();
        expect(avatar).toHaveAttribute('src', mockProfile.profilePictureThumbnailUrl);
      });
    });

    it('should display full name and username', async () => {
      renderWithRouter(
        <ProfileHoverCard userId="user-123" userHandle="testuser" isVisible={true} position={{ x: 0, y: 0 }} />
      );

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('@testuser')).toBeInTheDocument();
      });
    });

    it('should display bio', async () => {
      renderWithRouter(
        <ProfileHoverCard userId="user-123" userHandle="testuser" isVisible={true} position={{ x: 0, y: 0 }} />
      );

      await waitFor(() => {
        expect(screen.getByText(/Software developer/)).toBeInTheDocument();
      });
    });

    it('should display stats (posts, followers, following)', async () => {
      renderWithRouter(
        <ProfileHoverCard userId="user-123" userHandle="testuser" isVisible={true} position={{ x: 0, y: 0 }} />
      );

      await waitFor(() => {
        expect(screen.getByText('42')).toBeInTheDocument(); // Posts
        expect(screen.getByText('150')).toBeInTheDocument(); // Followers
        expect(screen.getByText('75')).toBeInTheDocument(); // Following
      });
    });

    it('should truncate long bio', async () => {
      const longBio = 'a'.repeat(200);
      vi.mocked(profileService.profileService.getProfileByHandle).mockResolvedValue({
        ...mockProfile,
        bio: longBio
      });

      renderWithRouter(
        <ProfileHoverCard userId="user-123" userHandle="testuser" isVisible={true} position={{ x: 0, y: 0 }} />
      );

      await waitFor(() => {
        const bioElement = screen.getByTestId('profile-bio');
        expect(bioElement.textContent?.length).toBeLessThan(200);
        expect(bioElement.textContent).toContain('...');
      });
    });
  });

  describe('Follow Button Integration', () => {
    it('should display FollowButton', async () => {
      renderWithRouter(
        <ProfileHoverCard userId="user-123" userHandle="testuser" isVisible={true} position={{ x: 0, y: 0 }} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('follow-button')).toBeInTheDocument();
      });
    });

    it('should pass userId to FollowButton', async () => {
      renderWithRouter(
        <ProfileHoverCard userId="user-123" userHandle="testuser" isVisible={true} position={{ x: 0, y: 0 }} />
      );

      await waitFor(() => {
        const followButton = screen.getByTestId('follow-button');
        expect(followButton.closest('[data-user-id]')).toBeTruthy();
      });
    });

    it('should not show FollowButton for current user', async () => {
      vi.mocked(profileService.profileService.getProfileByHandle).mockResolvedValue({
        ...mockProfile,
        id: 'current-user'
      });

      renderWithRouter(
        <ProfileHoverCard userId="current-user" userHandle="testuser" isVisible={true} position={{ x: 0, y: 0 }} />
      );

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('follow-button')).not.toBeInTheDocument();
    });
  });

  describe('Design System Styling', () => {
    it('should have TamaFriends design system classes', async () => {
      renderWithRouter(
        <ProfileHoverCard userId="user-123" userHandle="testuser" isVisible={true} position={{ x: 0, y: 0 }} />
      );

      await waitFor(() => {
        const card = screen.getByTestId('profile-hover-card');
        expect(card).toHaveClass('profile-hover-card');
      });
    });

    it('should have shadow and border styling', async () => {
      renderWithRouter(
        <ProfileHoverCard userId="user-123" userHandle="testuser" isVisible={true} position={{ x: 0, y: 0 }} />
      );

      await waitFor(() => {
        const card = screen.getByTestId('profile-hover-card');
        expect(card).toHaveClass('profile-hover-card--shadow');
      });
    });

    it('should use Material Icon for avatar placeholder', async () => {
      // Mock profile without avatar images to trigger placeholder
      vi.mocked(profileService.profileService.getProfileByHandle).mockResolvedValue({
        ...mockProfile,
        profilePictureUrl: undefined,
        profilePictureThumbnailUrl: undefined
      } as any);

      renderWithRouter(
        <ProfileHoverCard userId="user-123" userHandle="testuser" isVisible={true} position={{ x: 0, y: 0 }} />
      );

      await waitFor(() => {
        const icons = document.querySelectorAll('.material-icon');
        expect(icons.length).toBeGreaterThan(0);
        // Verify it's the person icon for avatar placeholder
        expect(screen.getByText('person')).toBeInTheDocument();
      });
    });
  });

  describe('Hover Behavior', () => {
    it('should call onMouseEnter callback', async () => {
      const handleMouseEnter = vi.fn();
      const user = userEvent.setup();

      renderWithRouter(
        <ProfileHoverCard
          userId="user-123"
          userHandle="testuser"
          isVisible={true}
          position={{ x: 0, y: 0 }}
          onMouseEnter={handleMouseEnter}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('profile-hover-card')).toBeInTheDocument();
      });

      const card = screen.getByTestId('profile-hover-card');
      await user.hover(card);

      expect(handleMouseEnter).toHaveBeenCalled();
    });

    it('should call onMouseLeave callback', async () => {
      const handleMouseLeave = vi.fn();
      const user = userEvent.setup();

      renderWithRouter(
        <ProfileHoverCard
          userId="user-123"
          userHandle="testuser"
          isVisible={true}
          position={{ x: 0, y: 0 }}
          onMouseLeave={handleMouseLeave}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('profile-hover-card')).toBeInTheDocument();
      });

      const card = screen.getByTestId('profile-hover-card');
      await user.hover(card);
      await user.unhover(card);

      expect(handleMouseLeave).toHaveBeenCalled();
    });
  });

  describe('Link to Profile', () => {
    it('should link to full profile page', async () => {
      renderWithRouter(
        <ProfileHoverCard userId="user-123" userHandle="testuser" isVisible={true} position={{ x: 0, y: 0 }} />
      );

      await waitFor(() => {
        const profileLink = screen.getByRole('link', { name: /view profile/i });
        expect(profileLink).toHaveAttribute('href', '/profile/testuser');
      });
    });

    it('should close card when clicking view profile link', async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();

      renderWithRouter(
        <ProfileHoverCard
          userId="user-123"
          userHandle="testuser"
          isVisible={true}
          position={{ x: 0, y: 0 }}
          onClose={handleClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /view profile/i })).toBeInTheDocument();
      });

      const profileLink = screen.getByRole('link', { name: /view profile/i });
      await user.click(profileLink);

      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA role', async () => {
      renderWithRouter(
        <ProfileHoverCard userId="user-123" userHandle="testuser" isVisible={true} position={{ x: 0, y: 0 }} />
      );

      await waitFor(() => {
        const card = screen.getByTestId('profile-hover-card');
        expect(card).toHaveAttribute('role', 'dialog');
      });
    });

    it('should have proper ARIA label', async () => {
      renderWithRouter(
        <ProfileHoverCard userId="user-123" userHandle="testuser" isVisible={true} position={{ x: 0, y: 0 }} />
      );

      await waitFor(() => {
        const card = screen.getByTestId('profile-hover-card');
        expect(card).toHaveAttribute('aria-label', 'Profile preview for Test User');
      });
    });

    it('should support keyboard ESC to close', async () => {
      const handleClose = vi.fn();

      renderWithRouter(
        <ProfileHoverCard
          userId="user-123"
          userHandle="testuser"
          isVisible={true}
          position={{ x: 0, y: 0 }}
          onClose={handleClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('profile-hover-card')).toBeInTheDocument();
      });

      // Simulate ESC key press
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing profile data gracefully', async () => {
      vi.mocked(profileService.profileService.getProfileByHandle).mockResolvedValue({
        id: 'user-123',
        handle: 'testuser',
        username: 'testuser',
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z'
      } as any);

      renderWithRouter(
        <ProfileHoverCard userId="user-123" userHandle="testuser" isVisible={true} position={{ x: 0, y: 0 }} />
      );

      await waitFor(() => {
        expect(screen.getByText('@testuser')).toBeInTheDocument();
      });

      // Should not crash when optional fields are missing
      expect(screen.queryByTestId('profile-bio')).not.toBeInTheDocument();
    });

    it('should handle empty userHandle', () => {
      renderWithRouter(
        <ProfileHoverCard userId="user-123" userHandle="" isVisible={true} position={{ x: 0, y: 0 }} />
      );

      expect(screen.queryByTestId('profile-hover-card')).not.toBeInTheDocument();
    });

    it('should not fetch when userHandle changes while invisible', () => {
      const { rerender } = renderWithRouter(
        <ProfileHoverCard userId="user-123" userHandle="testuser" isVisible={false} position={{ x: 0, y: 0 }} />
      );

      rerender(
        <MemoryRouter>
          <ProfileHoverCard userId="user-456" userHandle="otheruser" isVisible={false} position={{ x: 0, y: 0 }} />
        </MemoryRouter>
      );

      expect(profileService.profileService.getProfileByHandle).not.toHaveBeenCalled();
    });
  });

  describe('Z-Index and Layering', () => {
    it('should have high z-index class for proper layering', async () => {
      renderWithRouter(
        <ProfileHoverCard userId="user-123" userHandle="testuser" isVisible={true} position={{ x: 0, y: 0 }} />
      );

      await waitFor(() => {
        const card = screen.getByTestId('profile-hover-card');
        // Check that the card has the class that applies high z-index via CSS
        expect(card).toHaveClass('profile-hover-card');
      });
    });
  });
});
