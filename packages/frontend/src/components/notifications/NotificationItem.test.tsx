/**
 * NotificationItem Component Tests
 * 
 * TDD approach: Write tests first
 * Tests the composite notification item that combines all atomic components
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationItem } from './NotificationItem';
import { createMockNotification } from '../../services/__tests__/fixtures/notificationFixtures';

describe('NotificationItem', () => {
  const mockOnClick = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
    mockOnDelete.mockClear();
  });

  describe('Component Composition', () => {
    it('should render all atomic components together', () => {
      const notification = createMockNotification({
        status: 'unread',
        actor: {
          userId: 'user-1',
          handle: 'johndoe',
          displayName: 'John Doe',
          avatarUrl: 'https://example.com/avatar.jpg'
        }
      });

      const { container } = render(
        <NotificationItem
          notification={notification}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      // Should have avatar
      expect(screen.getByRole('img', { name: 'John Doe' })).toBeInTheDocument();
      
      // Should have content text
      expect(screen.getByText('John Doe liked your post')).toBeInTheDocument();
      
      // Should have unread dot
      expect(container.querySelector('.notification-item__unread-dot')).toBeInTheDocument();
      
      // Should have delete button
      expect(screen.getByLabelText(/delete/i)).toBeInTheDocument();
    });

    it('should render thumbnail when notification has post target with thumbnailUrl', () => {
      const notification = createMockNotification({
        target: {
          type: 'post',
          id: 'post-1',
          url: '/posts/post-1'
        },
        metadata: {
          thumbnailUrl: 'https://example.com/thumbnail.jpg'
        }
      });

      render(
        <NotificationItem
          notification={notification}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      const thumbnails = screen.getAllByRole('img');
      const thumbnailImg = thumbnails.find(img => 
        img.getAttribute('src') === 'https://example.com/thumbnail.jpg'
      );
      expect(thumbnailImg).toBeInTheDocument();
    });

    it('should not render thumbnail when notification has no metadata', () => {
      const notification = createMockNotification({
        metadata: undefined
      });

      const { container } = render(
        <NotificationItem
          notification={notification}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      const thumbnail = container.querySelector('.notification-item__thumbnail');
      expect(thumbnail).not.toBeInTheDocument();
    });

    it('should not render unread dot for read notifications', () => {
      const notification = createMockNotification({
        status: 'read'
      });

      const { container } = render(
        <NotificationItem
          notification={notification}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      const unreadDot = container.querySelector('.notification-item__unread-dot');
      expect(unreadDot).not.toBeInTheDocument();
    });
  });

  describe('Click Interactions', () => {
    it('should call onClick when notification is clicked', () => {
      const notification = createMockNotification();

      render(
        <NotificationItem
          notification={notification}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      const notificationElement = screen.getByText('John Doe liked your post').closest('.notification-item');
      fireEvent.click(notificationElement!);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
      expect(mockOnClick).toHaveBeenCalledWith(notification);
    });

    it('should call onDelete when delete button is clicked', () => {
      const notification = createMockNotification({ id: 'notif-123' });

      render(
        <NotificationItem
          notification={notification}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByLabelText(/delete/i);
      fireEvent.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      expect(mockOnDelete).toHaveBeenCalledWith('notif-123', expect.any(Object));
    });

    it('should stop propagation when delete button is clicked', () => {
      const notification = createMockNotification();

      render(
        <NotificationItem
          notification={notification}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByLabelText(/delete/i);
      fireEvent.click(deleteButton);

      // onClick should not be called because stopPropagation prevents bubbling
      expect(mockOnClick).not.toHaveBeenCalled();
      expect(mockOnDelete).toHaveBeenCalled();
    });
  });

  describe('CSS Classes', () => {
    it('should apply unread class for unread notifications', () => {
      const notification = createMockNotification({
        status: 'unread'
      });

      const { container } = render(
        <NotificationItem
          notification={notification}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      const item = container.querySelector('.notification-item');
      expect(item).toHaveClass('notification-item--unread');
    });

    it('should not apply unread class for read notifications', () => {
      const notification = createMockNotification({
        status: 'read'
      });

      const { container } = render(
        <NotificationItem
          notification={notification}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      const item = container.querySelector('.notification-item');
      expect(item).not.toHaveClass('notification-item--unread');
    });

    it('should always have base notification-item class', () => {
      const notification = createMockNotification();

      const { container } = render(
        <NotificationItem
          notification={notification}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      const item = container.querySelector('.notification-item');
      expect(item).toHaveClass('notification-item');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for delete button', () => {
      const notification = createMockNotification();

      render(
        <NotificationItem
          notification={notification}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByLabelText(/delete notification/i);
      expect(deleteButton).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      const notification = createMockNotification();

      const { container } = render(
        <NotificationItem
          notification={notification}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      const item = container.querySelector('.notification-item');
      expect(item).toHaveAttribute('role', 'button');
      expect(item).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Edge Cases', () => {
    it('should handle notification without actor', () => {
      const notification = createMockNotification({
        actor: undefined
      });

      render(
        <NotificationItem
          notification={notification}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Someone liked your post')).toBeInTheDocument();
    });

    it('should handle notification without target', () => {
      const notification = createMockNotification({
        target: undefined
      });

      render(
        <NotificationItem
          notification={notification}
          onClick={mockOnClick}
          onDelete={mockOnDelete}
        />
      );

      // Should still render without error
      expect(screen.getByText('John Doe liked your post')).toBeInTheDocument();
    });
  });
});
