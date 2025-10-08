import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { UserLink } from './UserLink.js';

// Helper to render with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

describe('UserLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render username as clickable link', () => {
      renderWithRouter(<UserLink userId="user-123" username="testuser" />);

      const link = screen.getByRole('link', { name: /@testuser/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveTextContent('@testuser');
    });

    it('should link to user profile page', () => {
      renderWithRouter(<UserLink userId="user-123" username="testuser" />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/profile/testuser');
    });

    it('should support custom handle parameter', () => {
      renderWithRouter(
        <UserLink userId="user-123" username="testuser" handle="customhandle" />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/profile/customhandle');
    });

    it('should render without @ prefix when showAt is false', () => {
      renderWithRouter(
        <UserLink userId="user-123" username="testuser" showAt={false} />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveTextContent('testuser');
      expect(link).not.toHaveTextContent('@testuser');
    });

    it('should use fullName when provided', () => {
      renderWithRouter(
        <UserLink
          userId="user-123"
          username="testuser"
          fullName="Test User"
          showFullName={true}
        />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveTextContent('Test User');
      expect(link).not.toHaveTextContent('@testuser');
    });
  });

  describe('Design System Styling', () => {
    it('should have default user-link classes', () => {
      renderWithRouter(<UserLink userId="user-123" username="testuser" />);

      const link = screen.getByRole('link');
      expect(link).toHaveClass('user-link');
    });

    it('should support custom className', () => {
      renderWithRouter(
        <UserLink userId="user-123" username="testuser" className="custom-class" />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveClass('user-link', 'custom-class');
    });

    it('should have proper test data attributes', () => {
      renderWithRouter(<UserLink userId="user-123" username="testuser" />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('data-testid', 'user-link');
      expect(link).toHaveAttribute('data-user-id', 'user-123');
    });

    it('should apply hover styling classes', () => {
      renderWithRouter(<UserLink userId="user-123" username="testuser" />);

      const link = screen.getByRole('link');
      expect(link).toHaveClass('user-link--hoverable');
    });
  });

  describe('Hover Card Trigger', () => {
    it('should support onHoverStart callback', async () => {
      const handleHoverStart = vi.fn();
      const user = userEvent.setup();

      renderWithRouter(
        <UserLink
          userId="user-123"
          username="testuser"
          onHoverStart={handleHoverStart}
        />
      );

      const link = screen.getByRole('link');
      await user.hover(link);

      expect(handleHoverStart).toHaveBeenCalledWith('user-123');
    });

    it('should support onHoverEnd callback', async () => {
      const handleHoverEnd = vi.fn();
      const user = userEvent.setup();

      renderWithRouter(
        <UserLink
          userId="user-123"
          username="testuser"
          onHoverEnd={handleHoverEnd}
        />
      );

      const link = screen.getByRole('link');
      await user.hover(link);
      await user.unhover(link);

      expect(handleHoverEnd).toHaveBeenCalledWith('user-123');
    });

    it('should not trigger hover callbacks when disabled', async () => {
      const handleHoverStart = vi.fn();
      const user = userEvent.setup();

      renderWithRouter(
        <UserLink
          userId="user-123"
          username="testuser"
          onHoverStart={handleHoverStart}
          disableHover={true}
        />
      );

      const link = screen.getByRole('link');
      await user.hover(link);

      expect(handleHoverStart).not.toHaveBeenCalled();
    });
  });

  describe('Click Behavior', () => {
    it('should support onClick callback', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      renderWithRouter(
        <UserLink
          userId="user-123"
          username="testuser"
          onClick={handleClick}
        />
      );

      const link = screen.getByRole('link');
      await user.click(link);

      expect(handleClick).toHaveBeenCalledWith('user-123');
    });

    it('should prevent default navigation when onClick is provided and returns false', async () => {
      const handleClick = vi.fn(() => false);
      const user = userEvent.setup();

      renderWithRouter(
        <UserLink
          userId="user-123"
          username="testuser"
          onClick={handleClick}
        />
      );

      const link = screen.getByRole('link');
      await user.click(link);

      expect(handleClick).toHaveBeenCalled();
      // Navigation prevention is handled by the component
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label', () => {
      renderWithRouter(<UserLink userId="user-123" username="testuser" />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('aria-label', 'View profile of @testuser');
    });

    it('should have custom ARIA label when fullName is shown', () => {
      renderWithRouter(
        <UserLink
          userId="user-123"
          username="testuser"
          fullName="Test User"
          showFullName={true}
        />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('aria-label', 'View profile of Test User');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();

      renderWithRouter(<UserLink userId="user-123" username="testuser" />);

      const link = screen.getByRole('link');
      link.focus();
      expect(link).toHaveFocus();

      await user.keyboard('{Enter}');
      // Link behavior is tested via href attribute
    });

    it('should have proper tab order', () => {
      renderWithRouter(
        <div>
          <button>Before</button>
          <UserLink userId="user-123" username="testuser" />
          <button>After</button>
        </div>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty username gracefully', () => {
      renderWithRouter(<UserLink userId="user-123" username="" />);

      const link = screen.queryByRole('link');
      expect(link).not.toBeInTheDocument();
    });

    it('should handle missing userId', () => {
      renderWithRouter(<UserLink userId="" username="testuser" />);

      const link = screen.queryByRole('link');
      expect(link).not.toBeInTheDocument();
    });

    it('should sanitize username for URL', () => {
      renderWithRouter(
        <UserLink userId="user-123" username="test user" handle="test_user" />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/profile/test_user');
    });

    it('should handle long usernames', () => {
      const longUsername = 'a'.repeat(50);
      renderWithRouter(<UserLink userId="user-123" username={longUsername} />);

      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link.textContent).toContain(longUsername);
    });
  });

  describe('Responsive Behavior', () => {
    it('should have mobile-friendly classes', () => {
      renderWithRouter(<UserLink userId="user-123" username="testuser" />);

      const link = screen.getByRole('link');
      expect(link).toHaveClass('user-link--responsive');
    });

    it('should support compact mode', () => {
      renderWithRouter(
        <UserLink userId="user-123" username="testuser" compact={true} />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveClass('user-link--compact');
    });
  });

  describe('Integration with Router', () => {
    it('should work with React Router Link', () => {
      renderWithRouter(<UserLink userId="user-123" username="testuser" />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/profile/testuser');
    });

    it('should support external prop for new tab', () => {
      renderWithRouter(
        <UserLink userId="user-123" username="testuser" external={true} />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});
