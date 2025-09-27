import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileDisplay } from './ProfileDisplay';
import type { PublicProfile } from '@social-media-app/shared';

// Mock window.matchMedia for jsdom environment
const mockMatchMedia = vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

describe('ProfileDisplay Component - Wireframe Implementation', () => {
  beforeEach(() => {
    // Set up matchMedia mock for responsive tests
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const mockPublicProfile: PublicProfile = {
    id: 'user-123',
    handle: 'johndoe',
    username: 'johndoe',
    fullName: 'John Doe',
    bio: 'Software developer passionate about clean code',
    profilePictureUrl: 'https://example.com/avatar.jpg',
    profilePictureThumbnailUrl: 'https://example.com/avatar-thumb.jpg',
    postsCount: 42,
    followersCount: 150,
    followingCount: 75,
    createdAt: '2024-01-15T10:30:00.000Z'
  };

  const mockUserProfile = {
    ...mockPublicProfile,
    email: 'john@example.com',
    emailVerified: true,
    updatedAt: '2024-01-20T15:45:00.000Z'
  };

  describe('Wireframe Layout Structure', () => {
    it('should render with wireframe-compliant three-section layout', () => {
      render(<ProfileDisplay profile={mockPublicProfile} />);

      // Should have main profile display container
      const profileDisplay = screen.getByTestId('profile-display');
      expect(profileDisplay).toBeInTheDocument();
      expect(profileDisplay).toHaveClass('profile-display--wireframe');

      // Should have avatar section (200x200px as per wireframe)
      const avatarSection = screen.getByTestId('profile-avatar-section');
      expect(avatarSection).toBeInTheDocument();
      expect(avatarSection).toHaveClass('profile-avatar-section--wireframe');

      // Should have info section with header and details
      const infoSection = screen.getByTestId('profile-info-section');
      expect(infoSection).toBeInTheDocument();
      expect(infoSection).toHaveClass('profile-info-section--wireframe');

      // Should have actions section (for buttons and quick actions)
      const actionsSection = screen.getByTestId('profile-actions-section');
      expect(actionsSection).toBeInTheDocument();
      expect(actionsSection).toHaveClass('profile-actions-section--wireframe');
    });

    it('should implement wireframe avatar specifications (200x200px container)', () => {
      render(<ProfileDisplay profile={mockPublicProfile} />);

      const avatarContainer = screen.getByTestId('profile-avatar');
      expect(avatarContainer).toBeInTheDocument();

      // Should have wireframe-compliant styling
      expect(avatarContainer).toHaveClass('avatar-container--wireframe');

      // Should be wrapped in StoryRing for Instagram-style presentation
      const storyRing = avatarContainer.closest('[class*="story-ring"]');
      expect(storyRing).toBeInTheDocument();
    });

    it('should display profile header following wireframe specifications', () => {
      render(<ProfileDisplay profile={mockPublicProfile} />);

      // Username with @ prefix (wireframe requirement)
      const username = screen.getByTestId('profile-username');
      expect(username).toBeInTheDocument();
      expect(username).toHaveTextContent('@johndoe');
      expect(username).toHaveClass('profile-username--wireframe');

      // Full name display
      const fullName = screen.getByTestId('profile-fullname');
      expect(fullName).toBeInTheDocument();
      expect(fullName).toHaveTextContent('John Doe');
      expect(fullName).toHaveClass('profile-fullname--wireframe');
    });

    it('should implement statistics display with wireframe LCD-style layout', () => {
      render(<ProfileDisplay profile={mockPublicProfile} />);

      // Statistics container should follow wireframe specs
      const statsContainer = screen.getByTestId('profile-stats');
      expect(statsContainer).toBeInTheDocument();
      expect(statsContainer).toHaveClass('profile-stats--wireframe');

      // Individual stat items should have LCD-style display
      const postsStats = screen.getByTestId('stat-posts');
      expect(postsStats).toBeInTheDocument();
      expect(postsStats).toHaveClass('stat-item--lcd');
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('Posts')).toBeInTheDocument();

      const followersStats = screen.getByTestId('stat-followers');
      expect(followersStats).toBeInTheDocument();
      expect(followersStats).toHaveClass('stat-item--lcd');
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('Followers')).toBeInTheDocument();

      const followingStats = screen.getByTestId('stat-following');
      expect(followingStats).toBeInTheDocument();
      expect(followingStats).toHaveClass('stat-item--lcd');
      expect(screen.getByText('75')).toBeInTheDocument();
      expect(screen.getByText('Following')).toBeInTheDocument();
    });

    it('should format large numbers with K/M notation for stats display', () => {
      const profileWithLargeStats = {
        ...mockPublicProfile,
        followersCount: 1200,
        followingCount: 75000,
        postsCount: 1500000
      };

      render(<ProfileDisplay profile={profileWithLargeStats} />);

      expect(screen.getByText('1.5M')).toBeInTheDocument(); // Posts
      expect(screen.getByText('1.2K')).toBeInTheDocument(); // Followers
      expect(screen.getByText('75K')).toBeInTheDocument(); // Following
    });

    it('should display bio section with wireframe styling', () => {
      render(<ProfileDisplay profile={mockPublicProfile} />);

      const bioSection = screen.getByTestId('profile-bio');
      expect(bioSection).toBeInTheDocument();
      expect(bioSection).toHaveClass('profile-bio--wireframe');
      expect(bioSection).toHaveTextContent('Software developer passionate about clean code');
    });

    it('should show member since information for public profiles', () => {
      render(<ProfileDisplay profile={mockPublicProfile} />);

      const memberSince = screen.getByTestId('profile-member-since');
      expect(memberSince).toBeInTheDocument();
      expect(memberSince).toHaveTextContent('Member since January 15, 2024');
      expect(memberSince).toHaveClass('profile-meta--wireframe');
    });
  });

  describe('Edit Profile Integration', () => {
    it('should render edit button when showEditButton is true', () => {
      const mockOnEditClick = vi.fn();

      render(
        <ProfileDisplay
          profile={mockUserProfile}
          showEditButton={true}
          onEditClick={mockOnEditClick}
        />
      );

      const editButton = screen.getByTestId('profile-edit-button');
      expect(editButton).toBeInTheDocument();
      expect(editButton).toHaveClass('tama-btn--automotive'); // New automotive styling
      expect(editButton).toHaveTextContent('Edit Profile');
    });

    it('should call onEditClick when edit button is clicked', async () => {
      const mockOnEditClick = vi.fn();
      const user = userEvent.setup();

      render(
        <ProfileDisplay
          profile={mockUserProfile}
          showEditButton={true}
          onEditClick={mockOnEditClick}
        />
      );

      const editButton = screen.getByTestId('profile-edit-button');
      await user.click(editButton);

      expect(mockOnEditClick).toHaveBeenCalledOnce();
    });

    it('should not render edit button when showEditButton is false', () => {
      render(<ProfileDisplay profile={mockPublicProfile} showEditButton={false} />);

      const editButton = screen.queryByTestId('profile-edit-button');
      expect(editButton).not.toBeInTheDocument();
    });
  });

  describe('Avatar Click Functionality', () => {
    it('should make avatar clickable when onAvatarClick is provided', () => {
      const mockOnAvatarClick = vi.fn();

      render(
        <ProfileDisplay
          profile={mockPublicProfile}
          onAvatarClick={mockOnAvatarClick}
        />
      );

      const avatarContainer = screen.getByTestId('profile-avatar');
      expect(avatarContainer).toHaveClass('avatar-container--clickable');
      expect(avatarContainer).toHaveAttribute('title', '📷 Click to upload new pet photo');
    });

    it('should call onAvatarClick when avatar is clicked', async () => {
      const mockOnAvatarClick = vi.fn();
      const user = userEvent.setup();

      render(
        <ProfileDisplay
          profile={mockPublicProfile}
          onAvatarClick={mockOnAvatarClick}
        />
      );

      const avatarContainer = screen.getByTestId('profile-avatar');
      await user.click(avatarContainer);

      expect(mockOnAvatarClick).toHaveBeenCalledOnce();
    });

    it('should not be clickable when onAvatarClick is not provided', () => {
      render(<ProfileDisplay profile={mockPublicProfile} />);

      const avatarContainer = screen.getByTestId('profile-avatar');
      expect(avatarContainer).not.toHaveClass('avatar-container--clickable');
      expect(avatarContainer).not.toHaveAttribute('title');
    });
  });

  describe('Responsive Behavior', () => {
    it('should apply mobile layout classes on small screens', () => {
      // Mock matchMedia for mobile breakpoint
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(max-width: 767px)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<ProfileDisplay profile={mockPublicProfile} />);

      const profileDisplay = screen.getByTestId('profile-display');
      expect(profileDisplay).toHaveClass('profile-display--mobile');
    });

    it('should apply desktop layout classes on large screens', () => {
      // Mock matchMedia for desktop breakpoint
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(min-width: 1024px)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<ProfileDisplay profile={mockPublicProfile} />);

      const profileDisplay = screen.getByTestId('profile-display');
      expect(profileDisplay).toHaveClass('profile-display--desktop');
    });
  });

  describe('French Automotive Design System Integration', () => {
    it('should apply automotive color scheme to interactive elements', () => {
      const mockOnEditClick = vi.fn();

      render(
        <ProfileDisplay
          profile={mockUserProfile}
          showEditButton={true}
          onEditClick={mockOnEditClick}
        />
      );

      const editButton = screen.getByTestId('profile-edit-button');
      expect(editButton).toHaveClass('tama-btn--automotive');
      expect(editButton).toHaveClass('tama-btn--racing-red'); // French automotive color
    });

    it('should apply metallic gradient effects to profile elements', () => {
      render(<ProfileDisplay profile={mockPublicProfile} />);

      const statsContainer = screen.getByTestId('profile-stats');
      expect(statsContainer).toHaveClass('stats-container--metallic');

      // Should have data attribute for CSS gradient targeting
      expect(statsContainer).toHaveAttribute('data-automotive-finish', 'pearl-metallic');
    });

    it('should implement ASCII art borders for retro aesthetic', () => {
      render(<ProfileDisplay profile={mockPublicProfile} />);

      const profileDisplay = screen.getByTestId('profile-display');
      expect(profileDisplay).toHaveClass('profile-display--ascii-borders');

      // Should have data attribute for CSS ASCII border targeting
      expect(profileDisplay).toHaveAttribute('data-border-style', 'automotive-ascii');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing profile data gracefully', () => {
      const incompleteProfile = {
        id: 'user-123',
        handle: 'incomplete',
        username: 'incomplete'
      };

      render(<ProfileDisplay profile={incompleteProfile as any} />);

      // Should render with fallbacks
      expect(screen.getByTestId('profile-display')).toBeInTheDocument();
      expect(screen.getByText('@incomplete')).toBeInTheDocument();

      // Should not crash when optional fields are missing
      expect(screen.queryByTestId('profile-bio')).not.toBeInTheDocument();
      expect(screen.queryByTestId('profile-fullname')).not.toBeInTheDocument();
    });

    it('should display placeholder avatar when no profile picture', () => {
      const profileWithoutAvatar = {
        ...mockPublicProfile,
        profilePictureUrl: undefined,
        profilePictureThumbnailUrl: undefined
      };

      render(<ProfileDisplay profile={profileWithoutAvatar} />);

      const avatarContainer = screen.getByTestId('profile-avatar');
      expect(avatarContainer).toBeInTheDocument();

      // Should show default avatar icon
      const avatarIcon = avatarContainer.querySelector('svg');
      expect(avatarIcon).toBeInTheDocument();
      expect(avatarIcon).toHaveClass('avatar-icon--wireframe');
    });
  });

  describe('Accessibility Compliance', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<ProfileDisplay profile={mockPublicProfile} />);

      const profileDisplay = screen.getByTestId('profile-display');
      expect(profileDisplay).toHaveAttribute('role', 'region');
      expect(profileDisplay).toHaveAttribute('aria-label', 'User profile for @johndoe');

      const statsContainer = screen.getByTestId('profile-stats');
      expect(statsContainer).toHaveAttribute('role', 'group');
      expect(statsContainer).toHaveAttribute('aria-label', 'Profile statistics');
    });

    it('should support keyboard navigation for interactive elements', () => {
      const mockOnEditClick = vi.fn();

      render(
        <ProfileDisplay
          profile={mockUserProfile}
          showEditButton={true}
          onEditClick={mockOnEditClick}
        />
      );

      const editButton = screen.getByTestId('profile-edit-button');
      expect(editButton).toHaveAttribute('tabIndex', '0');
      expect(editButton).toHaveAttribute('aria-label', 'Edit profile information');
    });

    it('should meet color contrast requirements for automotive styling', () => {
      render(<ProfileDisplay profile={mockPublicProfile} />);

      const username = screen.getByTestId('profile-username');
      expect(username).toHaveAttribute('data-contrast-compliant', 'true');

      const statsNumbers = document.querySelectorAll('.stat-number');
      statsNumbers.forEach(statNumber => {
        expect(statNumber).toHaveAttribute('data-contrast-compliant', 'true');
      });
    });
  });
});