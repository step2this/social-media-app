import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyProfilePage } from './MyProfilePage';
import { useAuth } from '../../hooks/useAuth';
import { profileService } from '../../services/profileService';
import { renderWithRouter } from '../../test-utils/render-helpers';

// Mock dependencies
vi.mock('../../hooks/useAuth');
vi.mock('../../services/profileService', () => ({
  profileService: {
    getCurrentProfile: vi.fn(),
    updateProfile: vi.fn()
  }
}));

const mockUseAuth = useAuth as MockedFunction<typeof useAuth>;

describe('MyProfilePage Component', () => {
  const mockProfile = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    emailVerified: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    handle: 'testuser',
    fullName: 'Test User',
    bio: 'Test bio',
    profilePictureUrl: undefined,
    profilePictureThumbnailUrl: undefined,
    postsCount: 5,
    followersCount: 10,
    followingCount: 3
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: mockProfile.id,
        email: mockProfile.email,
        username: mockProfile.username,
        emailVerified: mockProfile.emailVerified,
        createdAt: mockProfile.createdAt,
        updatedAt: mockProfile.updatedAt
      },
      tokens: { accessToken: 'test-token', refreshToken: 'test-refresh', expiresIn: 3600 },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      isHydrated: true,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      refreshToken: vi.fn(),
      getProfile: vi.fn(),
      updateProfile: vi.fn(),
      checkSession: vi.fn(),
      clearError: vi.fn()
    });
  });

  describe('Component Rendering', () => {
    it('should render user profile information', async () => {
      vi.mocked(profileService.getCurrentProfile).mockResolvedValue(mockProfile);

      renderWithRouter(<MyProfilePage />);

      // Should show loading initially
      expect(screen.getByText('Loading profile...')).toBeInTheDocument();

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByText('🐾 My Pet Profile')).toBeInTheDocument();
      });

      expect(screen.getByText('@testuser')).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('Test bio')).toBeInTheDocument();
      expect(profileService.getCurrentProfile).toHaveBeenCalled();
    });

    it('should show edit button for own profile', async () => {
      vi.mocked(profileService.getCurrentProfile).mockResolvedValue(mockProfile);

      renderWithRouter(<MyProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-edit-button')).toBeInTheDocument();
      });
    });

    it('should display default avatar when no profile picture', async () => {
      const profileWithoutAvatar = { ...mockProfile, profilePictureUrl: undefined };
      vi.mocked(profileService.getCurrentProfile).mockResolvedValue(profileWithoutAvatar);

      renderWithRouter(<MyProfilePage />);

      await waitFor(() => {
        const avatarContainer = screen.getByTestId('profile-avatar');
        expect(avatarContainer).toBeInTheDocument();
        // Should contain default avatar SVG or placeholder
        expect(avatarContainer.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should display profile picture when available', async () => {
      const profileWithAvatar = {
        ...mockProfile,
        profilePictureUrl: 'https://example.com/avatar.jpg',
        profilePictureThumbnailUrl: 'https://example.com/avatar-thumb.jpg'
      };
      vi.mocked(profileService.getCurrentProfile).mockResolvedValue(profileWithAvatar);

      renderWithRouter(<MyProfilePage />);

      await waitFor(() => {
        const avatar = screen.getByAltText('Profile picture');
        expect(avatar).toBeInTheDocument();
        expect(avatar).toHaveAttribute('src', 'https://example.com/avatar-thumb.jpg');
      });
    });
  });

  describe('Edit Profile Modal', () => {
    it('should open edit modal when edit button is clicked', async () => {
      vi.mocked(profileService.getCurrentProfile).mockResolvedValue(mockProfile);

      const user = userEvent.setup();
      renderWithRouter(<MyProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-edit-button')).toBeInTheDocument();
      });

      const editButton = screen.getByTestId('profile-edit-button');
      await user.click(editButton);

      // Modal should be open with form fields
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
        expect(screen.getByLabelText('Bio')).toBeInTheDocument();
      });
    });

    it('should pre-fill form with current user data', async () => {
      vi.mocked(profileService.getCurrentProfile).mockResolvedValue(mockProfile);

      const user = userEvent.setup();
      renderWithRouter(<MyProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-edit-button')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('profile-edit-button'));

      await waitFor(() => {
        const fullNameInput = screen.getByLabelText('Full Name') as HTMLInputElement;
        const bioInput = screen.getByLabelText('Bio') as HTMLTextAreaElement;

        expect(fullNameInput.value).toBe('Test User');
        expect(bioInput.value).toBe('Test bio');
      });
    });

    it('should close modal when cancel is clicked', async () => {
      vi.mocked(profileService.getCurrentProfile).mockResolvedValue(mockProfile);

      const user = userEvent.setup();
      renderWithRouter(<MyProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-edit-button')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('profile-edit-button'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should update profile when form is submitted', async () => {
      vi.mocked(profileService.getCurrentProfile).mockResolvedValue(mockProfile);
      vi.mocked(profileService.updateProfile).mockResolvedValue({
        ...mockProfile,
        fullName: 'Updated Name',
        bio: 'Updated bio'
      });

      const user = userEvent.setup();
      renderWithRouter(<MyProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-edit-button')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('profile-edit-button'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Update form fields
      const fullNameInput = screen.getByLabelText('Full Name');
      const bioInput = screen.getByLabelText('Bio');

      await user.clear(fullNameInput);
      await user.type(fullNameInput, 'Updated Name');
      await user.clear(bioInput);
      await user.type(bioInput, 'Updated bio');

      // Submit form
      const saveButton = screen.getByRole('button', { name: 'Save Changes' });
      await user.click(saveButton);

      // Should call API and close modal
      await waitFor(() => {
        expect(profileService.updateProfile).toHaveBeenCalledWith({
          fullName: 'Updated Name',
          bio: 'Updated bio'
        });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Profile should be updated in UI
      await waitFor(() => {
        expect(screen.getByText('Updated Name')).toBeInTheDocument();
        expect(screen.getByText('Updated bio')).toBeInTheDocument();
      });
    });

    it('should show validation errors for invalid form data', async () => {
      vi.mocked(profileService.getCurrentProfile).mockResolvedValue(mockProfile);

      const user = userEvent.setup();
      renderWithRouter(<MyProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-edit-button')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('profile-edit-button'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Clear required field
      const fullNameInput = screen.getByLabelText('Full Name');
      await user.clear(fullNameInput);

      const saveButton = screen.getByRole('button', { name: 'Save Changes' });
      await user.click(saveButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText('Full name is required')).toBeInTheDocument();
      });

      // Should not close modal or call API
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(profileService.updateProfile).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(profileService.getCurrentProfile).mockResolvedValue(mockProfile);
      vi.mocked(profileService.updateProfile).mockRejectedValue(
        new Error('Server error')
      );

      const user = userEvent.setup();
      renderWithRouter(<MyProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-edit-button')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('profile-edit-button'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: 'Save Changes' });
      await user.click(saveButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Failed to update profile. Please try again.')).toBeInTheDocument();
      });

      // Modal should remain open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state while fetching profile', () => {
      vi.mocked(profileService.getCurrentProfile).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithRouter(<MyProfilePage />);

      expect(screen.getByText('Loading profile...')).toBeInTheDocument();
    });

    it('should show error state when profile fetch fails', async () => {
      vi.mocked(profileService.getCurrentProfile).mockRejectedValue(
        new Error('Failed to load profile')
      );

      renderWithRouter(<MyProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load profile')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
      });
    });

    it('should retry loading profile when retry button is clicked', async () => {
      vi.mocked(profileService.getCurrentProfile)
        .mockRejectedValueOnce(new Error('Failed to load profile'))
        .mockResolvedValueOnce(mockProfile);

      const user = userEvent.setup();
      renderWithRouter(<MyProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load profile')).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: 'Try Again' });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('🐾 My Pet Profile')).toBeInTheDocument();
        expect(screen.getByText('@testuser')).toBeInTheDocument();
      });

      expect(profileService.getCurrentProfile).toHaveBeenCalledTimes(2);
    });
  });

  describe('Authentication Integration', () => {
    it('should redirect to login when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        isHydrated: true,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
        refreshToken: vi.fn(),
        getProfile: vi.fn(),
        updateProfile: vi.fn(),
        checkSession: vi.fn(),
        clearError: vi.fn()
      });

      renderWithRouter(<MyProfilePage />);

      expect(screen.getByText('Please sign in to view your profile')).toBeInTheDocument();
    });

    it('should show loading when auth is in progress', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        isHydrated: true,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
        refreshToken: vi.fn(),
        getProfile: vi.fn(),
        updateProfile: vi.fn(),
        checkSession: vi.fn(),
        clearError: vi.fn()
      });

      renderWithRouter(<MyProfilePage />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});