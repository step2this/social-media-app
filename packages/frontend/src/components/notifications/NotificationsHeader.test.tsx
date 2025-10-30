/**
 * NotificationsHeader Component Tests
 *
 * TDD approach: Write tests first
 * Tests the header component with "Mark all as read" functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationsHeader } from './NotificationsHeader';

describe('NotificationsHeader', () => {
  const mockOnMarkAllAsRead = vi.fn();

  beforeEach(() => {
    mockOnMarkAllAsRead.mockClear();
  });

  describe('Rendering', () => {
    it('should render "Notifications" title', () => {
      render(
        <NotificationsHeader
          hasUnreadNotifications={false}
          onMarkAllAsRead={mockOnMarkAllAsRead}
        />
      );

      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('should render "Mark all as read" button when there are unread notifications', () => {
      render(
        <NotificationsHeader
          hasUnreadNotifications={true}
          onMarkAllAsRead={mockOnMarkAllAsRead}
        />
      );

      expect(screen.getByText('Mark all as read')).toBeInTheDocument();
    });

    it('should not render "Mark all as read" button when there are no unread notifications', () => {
      render(
        <NotificationsHeader
          hasUnreadNotifications={false}
          onMarkAllAsRead={mockOnMarkAllAsRead}
        />
      );

      expect(screen.queryByText('Mark all as read')).not.toBeInTheDocument();
    });

    it('should apply correct CSS class to header container', () => {
      const { container } = render(
        <NotificationsHeader
          hasUnreadNotifications={false}
          onMarkAllAsRead={mockOnMarkAllAsRead}
        />
      );

      expect(container.querySelector('.notifications-page__header')).toBeInTheDocument();
    });

    it('should apply correct CSS class to title', () => {
      const { container } = render(
        <NotificationsHeader
          hasUnreadNotifications={false}
          onMarkAllAsRead={mockOnMarkAllAsRead}
        />
      );

      const title = container.querySelector('.notifications-page__title');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Notifications');
    });

    it('should apply correct CSS class to button', () => {
      const { container } = render(
        <NotificationsHeader
          hasUnreadNotifications={true}
          onMarkAllAsRead={mockOnMarkAllAsRead}
        />
      );

      const button = container.querySelector('.notifications-page__mark-read-btn');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onMarkAllAsRead when button is clicked', () => {
      render(
        <NotificationsHeader
          hasUnreadNotifications={true}
          onMarkAllAsRead={mockOnMarkAllAsRead}
        />
      );

      const button = screen.getByText('Mark all as read');
      fireEvent.click(button);

      expect(mockOnMarkAllAsRead).toHaveBeenCalledTimes(1);
    });

    it('should not allow clicking button when disabled', () => {
      render(
        <NotificationsHeader
          hasUnreadNotifications={true}
          onMarkAllAsRead={mockOnMarkAllAsRead}
          disabled={true}
        />
      );

      const button = screen.getByText('Mark all as read');
      expect(button).toBeDisabled();
    });

    it('should allow clicking button when not disabled', () => {
      render(
        <NotificationsHeader
          hasUnreadNotifications={true}
          onMarkAllAsRead={mockOnMarkAllAsRead}
          disabled={false}
        />
      );

      const button = screen.getByText('Mark all as read');
      expect(button).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have button role for mark all as read', () => {
      render(
        <NotificationsHeader
          hasUnreadNotifications={true}
          onMarkAllAsRead={mockOnMarkAllAsRead}
        />
      );

      const button = screen.getByRole('button', { name: /mark all as read/i });
      expect(button).toBeInTheDocument();
    });

    it('should have proper heading role for title', () => {
      render(
        <NotificationsHeader
          hasUnreadNotifications={false}
          onMarkAllAsRead={mockOnMarkAllAsRead}
        />
      );

      const heading = screen.getByRole('heading', { name: 'Notifications' });
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle default disabled prop (undefined)', () => {
      render(
        <NotificationsHeader
          hasUnreadNotifications={true}
          onMarkAllAsRead={mockOnMarkAllAsRead}
        />
      );

      const button = screen.getByText('Mark all as read');
      expect(button).not.toBeDisabled();
    });

    it('should render with minimal props', () => {
      render(
        <NotificationsHeader
          hasUnreadNotifications={false}
          onMarkAllAsRead={mockOnMarkAllAsRead}
        />
      );

      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });
});
