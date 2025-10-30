/**
 * NotificationsError Component Tests
 *
 * TDD approach: Write tests first
 * Tests the error state display component with retry functionality
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationsError } from './NotificationsError';

describe('NotificationsError', () => {
  const mockOnRetry = vi.fn();

  beforeEach(() => {
    mockOnRetry.mockClear();
  });

  describe('Rendering', () => {
    it('should render error message', () => {
      render(
        <NotificationsError
          message="Failed to load notifications"
          onRetry={mockOnRetry}
        />
      );

      expect(screen.getByText('Failed to load notifications')).toBeInTheDocument();
    });

    it('should render default error message when not provided', () => {
      render(<NotificationsError onRetry={mockOnRetry} />);

      expect(screen.getByText('Failed to load notifications. Please try again.')).toBeInTheDocument();
    });

    it('should render retry button', () => {
      render(<NotificationsError onRetry={mockOnRetry} />);

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should apply correct CSS class to container', () => {
      const { container } = render(<NotificationsError onRetry={mockOnRetry} />);

      expect(container.querySelector('.notifications-page__error')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onRetry when retry button is clicked', () => {
      render(<NotificationsError onRetry={mockOnRetry} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should allow multiple retry attempts', () => {
      render(<NotificationsError onRetry={mockOnRetry} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(3);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for error alert', () => {
      const { container } = render(<NotificationsError onRetry={mockOnRetry} />);

      const errorDiv = container.querySelector('.notifications-page__error');
      expect(errorDiv).toHaveAttribute('role', 'alert');
    });

    it('should have accessible retry button', () => {
      render(<NotificationsError onRetry={mockOnRetry} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty error message', () => {
      render(<NotificationsError message="" onRetry={mockOnRetry} />);

      // Should show default message when empty
      expect(screen.getByText('Failed to load notifications. Please try again.')).toBeInTheDocument();
    });

    it('should handle very long error messages', () => {
      const longMessage = 'This is a very long error message that explains in detail what went wrong. '.repeat(5).trim();

      render(<NotificationsError message={longMessage} onRetry={mockOnRetry} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should render with minimal props', () => {
      render(<NotificationsError onRetry={mockOnRetry} />);

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });
});
