import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthModal } from './AuthModal';

describe('AuthModal UI Tests', () => {
  const mockOnClose = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Rendering and Controls', () => {
    it('should render login form by default', () => {
      render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          initialMode="login"
        />
      );

      expect(screen.getByText(/Welcome Back/)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render register form when initialMode is register', () => {
      render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          initialMode="register"
        />
      );

      expect(screen.getByText(/Create Your Pet Profile/)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start pet journey/i })).toBeInTheDocument();
    });

    it('should switch between login and register forms', async () => {
      const user = userEvent.setup();

      render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          initialMode="login"
        />
      );

      // Start with login form
      expect(screen.getByText(/Welcome Back/)).toBeInTheDocument();

      // Switch to register
      await user.click(screen.getByRole('button', { name: /create your pet profile/i }));

      // Now see register form
      expect(screen.getByText(/Create Your Pet Profile/)).toBeInTheDocument();
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();

      // Switch back to login
      await user.click(screen.getByRole('button', { name: /sign in to your pets/i }));

      // Back to login form
      expect(screen.getByText(/Welcome Back/)).toBeInTheDocument();
    });

    it('should close modal when close button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          initialMode="login"
        />
      );

      await user.click(screen.getByRole('button', { name: /close modal/i }));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal with Escape key', async () => {
      const user = userEvent.setup();

      render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          initialMode="login"
        />
      );

      await user.keyboard('{Escape}');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not render when closed', () => {
      render(
        <AuthModal
          isOpen={false}
          onClose={mockOnClose}
          initialMode="login"
        />
      );

      expect(screen.queryByText(/Welcome Back/)).not.toBeInTheDocument();
    });

    it('should reset to initial mode when reopened', async () => {
      const user = userEvent.setup();

      const { rerender } = render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          initialMode="login"
        />
      );

      // Switch to register
      await user.click(screen.getByRole('button', { name: /create your pet profile/i }));
      expect(screen.getByText(/Create Your Pet Profile/)).toBeInTheDocument();

      // Close and reopen
      rerender(
        <AuthModal
          isOpen={false}
          onClose={mockOnClose}
          initialMode="login"
        />
      );

      rerender(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          initialMode="login"
        />
      );

      // Should be back to login form
      expect(screen.getByText(/Welcome Back/)).toBeInTheDocument();
    });
  });

  describe('Form Validation UI', () => {
    it('should show password confirmation error in register form', async () => {
      const user = userEvent.setup();

      render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          initialMode="register"
        />
      );

      // Fill form with mismatched passwords
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'different123');

      await user.click(screen.getByRole('button', { name: /start pet journey/i }));

      // Form should display validation error
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });

    it('should allow filling out all form fields correctly', async () => {
      const user = userEvent.setup();

      render(
        <AuthModal
          isOpen={true}
          onClose={mockOnClose}
          initialMode="register"
        />
      );

      // Fill all fields
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePassword123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePassword123!');

      // Verify fields are filled
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
    });
  });
});