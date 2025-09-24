import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { MyProfilePage } from './MyProfilePage';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../services/apiClient';

// Mock dependencies
vi.mock('../../hooks/useAuth');
vi.mock('../../services/apiClient', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      auth: {
        getProfile: vi.fn(),
        updateProfile: vi.fn()
      }
    }
  };
});

const mockUseAuth = useAuth as MockedFunction<typeof useAuth>;

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('MyProfilePage Component', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    fullName: 'Test User',
    bio: 'Test bio',
    emailVerified: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      clearError: vi.fn()
    });
  });

  describe('Component Rendering', () => {
    it('should render user profile information', async () => {
      vi.mocked(apiClient.auth.getProfile).mockResolvedValue({
        user: mockUser
      });

      renderWithRouter(<MyProfilePage />);

      // Should show loading initially
      expect(screen.getByText('Loading profile...')).toBeInTheDocument();

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByText('My Profile')).toBeInTheDocument();
      });

      expect(screen.getByText('@testuser')).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('Test bio')).toBeInTheDocument();
      expect(apiClient.auth.getProfile).toHaveBeenCalled();
    });

    it('should show edit button for own profile', async () => {
      vi.mocked(apiClient.auth.getProfile).mockResolvedValue({
        user: mockUser
      });

      renderWithRouter(<MyProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Edit Profile' })).toBeInTheDocument();
      });
    });

    it('should display default avatar when no profile picture', async () => {
      const userWithoutAvatar = { ...mockUser, profilePictureUrl: undefined };
      vi.mocked(apiClient.auth.getProfile).mockResolvedValue({
        user: userWithoutAvatar
      });

      renderWithRouter(<MyProfilePage />);

      await waitFor(() => {
        const avatarContainer = screen.getByTestId('profile-avatar');
        expect(avatarContainer).toBeInTheDocument();
        // Should contain default avatar SVG or placeholder
        expect(avatarContainer.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should display profile picture when available', async () => {
      const userWithAvatar = {
        ...mockUser,
        profilePictureUrl: 'https://example.com/avatar.jpg',
        profilePictureThumbnailUrl: 'https://example.com/avatar-thumb.jpg'
      };
      vi.mocked(apiClient.auth.getProfile).mockResolvedValue({
        user: userWithAvatar
      });

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
      vi.mocked(apiClient.auth.getProfile).mockResolvedValue({
        user: mockUser
      });

      const user = userEvent.setup();
      renderWithRouter(<MyProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Edit Profile' })).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: 'Edit Profile' });
      await user.click(editButton);

      // Modal should be open with form fields
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
        expect(screen.getByLabelText('Bio')).toBeInTheDocument();
      });
    });

    it('should pre-fill form with current user data', async () => {
      vi.mocked(apiClient.auth.getProfile).mockResolvedValue({
        user: mockUser
      });

      const user = userEvent.setup();
      renderWithRouter(<MyProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Edit Profile' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Edit Profile' }));

      await waitFor(() => {
        const fullNameInput = screen.getByLabelText('Full Name') as HTMLInputElement;
        const bioInput = screen.getByLabelText('Bio') as HTMLTextAreaElement;

        expect(fullNameInput.value).toBe('Test User');
        expect(bioInput.value).toBe('Test bio');
      });
    });

    it('should close modal when cancel is clicked', async () => {
      vi.mocked(apiClient.auth.getProfile).mockResolvedValue({
        user: mockUser
      });

      const user = userEvent.setup();
      renderWithRouter(<MyProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Edit Profile' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Edit Profile' }));

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
      const updatedUser = {
        ...mockUser,
        fullName: 'Updated Name',
        bio: 'Updated bio'
      };

      vi.mocked(apiClient.auth.getProfile).mockResolvedValue({
        user: mockUser
      });
      vi.mocked(apiClient.auth.updateProfile).mockResolvedValue({
        user: updatedUser
      });

      const user = userEvent.setup();
      renderWithRouter(<MyProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Edit Profile' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Edit Profile' }));

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
        expect(apiClient.auth.updateProfile).toHaveBeenCalledWith({
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
      vi.mocked(apiClient.auth.getProfile).mockResolvedValue({
        user: mockUser
      });

      const user = userEvent.setup();
      renderWithRouter(<MyProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Edit Profile' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Edit Profile' }));

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
      expect(apiClient.auth.updateProfile).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(apiClient.auth.getProfile).mockResolvedValue({
        user: mockUser
      });
      vi.mocked(apiClient.auth.updateProfile).mockRejectedValue(
        new Error('Server error')
      );

      const user = userEvent.setup();
      renderWithRouter(<MyProfilePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Edit Profile' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Edit Profile' }));

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
      vi.mocked(apiClient.auth.getProfile).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithRouter(<MyProfilePage />);

      expect(screen.getByText('Loading profile...')).toBeInTheDocument();
    });

    it('should show error state when profile fetch fails', async () => {
      vi.mocked(apiClient.auth.getProfile).mockRejectedValue(
        new Error('Failed to load profile')
      );

      renderWithRouter(<MyProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load profile')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
      });
    });

    it('should retry loading profile when retry button is clicked', async () => {
      vi.mocked(apiClient.auth.getProfile)
        .mockRejectedValueOnce(new Error('Failed to load profile'))
        .mockResolvedValueOnce({ user: mockUser });

      const user = userEvent.setup();
      renderWithRouter(<MyProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load profile')).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: 'Try Again' });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('My Profile')).toBeInTheDocument();
        expect(screen.getByText('@testuser')).toBeInTheDocument();
      });

      expect(apiClient.auth.getProfile).toHaveBeenCalledTimes(2);
    });
  });

  describe('Authentication Integration', () => {
    it('should redirect to login when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
        clearError: vi.fn()
      });

      renderWithRouter(<MyProfilePage />);

      expect(screen.getByText('Please sign in to view your profile')).toBeInTheDocument();
    });

    it('should show loading when auth is in progress', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
        clearError: vi.fn()
      });

      renderWithRouter(<MyProfilePage />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});