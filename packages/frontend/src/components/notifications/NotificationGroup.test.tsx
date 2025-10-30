/**
 * NotificationGroup Component Tests
 *
 * TDD approach: Write tests first
 * Tests the notification group component that renders a section with title and items
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NotificationGroup } from './NotificationGroup';
import { createMockNotifications } from '../../services/__tests__/fixtures/notificationFixtures';

describe('NotificationGroup', () => {
  const mockOnClick = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
    mockOnDelete.mockClear();
  });

  describe('Rendering', () => {
    it('should render group title', () => {
      const notifications = createMockNotifications(2);

      render(
        <NotificationGroup
          title="Today"
          notifications={notifications}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('should render all notifications in group', () => {
      const notifications = createMockNotifications(3);

      render(
        <NotificationGroup
          title="This Week"
          notifications={notifications}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      // Should render 3 NotificationItem components
      const notificationElements = screen.getAllByRole('button').filter(
        el => el.classList.contains('notification-item')
      );
      expect(notificationElements).toHaveLength(3);
    });

    it('should not render when notifications array is empty', () => {
      const { container } = render(
        <NotificationGroup
          title="Yesterday"
          notifications={[]}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should apply correct CSS class to group container', () => {
      const notifications = createMockNotifications(1);

      const { container } = render(
        <NotificationGroup
          title="Today"
          notifications={notifications}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      expect(container.querySelector('.notifications-group')).toBeInTheDocument();
    });

    it('should apply correct CSS class to title', () => {
      const notifications = createMockNotifications(1);

      const { container } = render(
        <NotificationGroup
          title="Today"
          notifications={notifications}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      const titleElement = container.querySelector('.notifications-group__title');
      expect(titleElement).toBeInTheDocument();
      expect(titleElement).toHaveTextContent('Today');
    });
  });

  describe('Event Handlers', () => {
    it('should pass onClick handler to NotificationItem components', () => {
      const notifications = createMockNotifications(2);

      render(
        <NotificationGroup
          title="Today"
          notifications={notifications}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      // Click first notification
      const firstNotification = screen.getAllByText(/liked your post/i)[0];
      const notificationElement = firstNotification.closest('.notification-item');

      if (notificationElement) {
        notificationElement.click();
        expect(mockOnClick).toHaveBeenCalledWith(notifications[0]);
      }
    });

    it('should pass onDelete handler to NotificationItem components', () => {
      const notifications = createMockNotifications(1);

      render(
        <NotificationGroup
          title="Today"
          notifications={notifications}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      // Click delete button
      const deleteButton = screen.getByLabelText(/delete notification/i);
      deleteButton.click();

      expect(mockOnDelete).toHaveBeenCalledWith(
        notifications[0].id,
        expect.any(Object)
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle single notification', () => {
      const notifications = createMockNotifications(1);

      render(
        <NotificationGroup
          title="Today"
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
      const notifications = createMockNotifications(20);

      render(
        <NotificationGroup
          title="Earlier"
          notifications={notifications}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      const notificationElements = screen.getAllByRole('button').filter(
        el => el.classList.contains('notification-item')
      );
      expect(notificationElements).toHaveLength(20);
    });
  });
});
