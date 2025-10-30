/**
 * NotificationsList Component Tests
 *
 * TDD approach: Write tests first
 * Tests the main container component that renders all notification groups
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NotificationsList } from './NotificationsList';
import { createMockNotifications } from '../../services/__tests__/fixtures/notificationFixtures';

describe('NotificationsList', () => {
  const mockOnClick = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
    mockOnDelete.mockClear();
  });

  describe('Rendering', () => {
    it('should render notifications grouped by time periods', () => {
      const todayNotif = createMockNotifications(1, {
        createdAt: new Date().toISOString()
      });
      const yesterdayNotif = createMockNotifications(1, {
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago
      });

      const notifications = [...todayNotif, ...yesterdayNotif];

      render(
        <NotificationsList
          notifications={notifications}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Yesterday')).toBeInTheDocument();
    });

    it('should render all time groups with notifications', () => {
      const now = new Date();
      const notifications = [
        ...createMockNotifications(1, { createdAt: now.toISOString() }), // Today
        ...createMockNotifications(1, { createdAt: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString() }), // Yesterday
        ...createMockNotifications(1, { createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() }), // This Week
        ...createMockNotifications(1, { createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString() }), // This Month
        ...createMockNotifications(1, { createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString() }), // Earlier
      ];

      render(
        <NotificationsList
          notifications={notifications}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Yesterday')).toBeInTheDocument();
      expect(screen.getByText('This Week')).toBeInTheDocument();
      expect(screen.getByText('This Month')).toBeInTheDocument();
      expect(screen.getByText('Earlier')).toBeInTheDocument();
    });

    it('should not render empty groups', () => {
      const notifications = createMockNotifications(2, {
        createdAt: new Date().toISOString() // All today
      });

      render(
        <NotificationsList
          notifications={notifications}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.queryByText('Yesterday')).not.toBeInTheDocument();
      expect(screen.queryByText('This Week')).not.toBeInTheDocument();
    });

    it('should apply correct CSS class to container', () => {
      const notifications = createMockNotifications(1);

      const { container } = render(
        <NotificationsList
          notifications={notifications}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      expect(container.querySelector('.notifications-page__list')).toBeInTheDocument();
    });
  });

  describe('Event Handlers', () => {
    it('should pass onClick handler to notification groups', () => {
      const notifications = createMockNotifications(1);

      render(
        <NotificationsList
          notifications={notifications}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      const notificationElement = screen.getByText(/liked your post/i).closest('.notification-item');
      if (notificationElement) {
        notificationElement.click();
        expect(mockOnClick).toHaveBeenCalledWith(notifications[0]);
      }
    });

    it('should pass onDelete handler to notification groups', () => {
      const notifications = createMockNotifications(1);

      render(
        <NotificationsList
          notifications={notifications}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByLabelText(/delete notification/i);
      deleteButton.click();

      expect(mockOnDelete).toHaveBeenCalledWith(notifications[0].id, expect.any(Object));
    });
  });

  describe('Empty State', () => {
    it('should render empty container when no notifications', () => {
      const { container } = render(
        <NotificationsList
          notifications={[]}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      const listContainer = container.querySelector('.notifications-page__list');
      expect(listContainer).toBeInTheDocument();
      expect(listContainer?.children.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single notification', () => {
      const notifications = createMockNotifications(1);

      render(
        <NotificationsList
          notifications={notifications}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      const notificationElements = screen.getAllByRole('button').filter(
        el => el.classList.contains('notification-item')
      );
      expect(notificationElements).toHaveLength(1);
    });

    it('should handle many notifications', () => {
      const notifications = createMockNotifications(50);

      render(
        <NotificationsList
          notifications={notifications}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      const notificationElements = screen.getAllByRole('button').filter(
        el => el.classList.contains('notification-item')
      );
      expect(notificationElements).toHaveLength(50);
    });
  });
});
