/**
 * NotificationUnreadDot Component Tests
 * 
 * TDD approach: Write tests first
 * Tests the unread indicator dot display logic
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { NotificationUnreadDot } from './NotificationUnreadDot';

describe('NotificationUnreadDot', () => {
  describe('Visibility', () => {
    it('should render dot when isUnread is true', () => {
      const { container } = render(
        <NotificationUnreadDot isUnread={true} />
      );

      const dot = container.querySelector('.notification-item__unread-dot');
      expect(dot).toBeInTheDocument();
    });

    it('should not render dot when isUnread is false', () => {
      const { container } = render(
        <NotificationUnreadDot isUnread={false} />
      );

      const dot = container.querySelector('.notification-item__unread-dot');
      expect(dot).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have default ARIA label when not provided', () => {
      const { container } = render(
        <NotificationUnreadDot isUnread={true} />
      );

      const dot = container.querySelector('.notification-item__unread-dot');
      expect(dot).toHaveAttribute('aria-label', 'Unread notification');
    });

    it('should use custom ARIA label when provided', () => {
      const { container } = render(
        <NotificationUnreadDot isUnread={true} ariaLabel="New message" />
      );

      const dot = container.querySelector('.notification-item__unread-dot');
      expect(dot).toHaveAttribute('aria-label', 'New message');
    });

    it('should have role attribute for accessibility', () => {
      const { container } = render(
        <NotificationUnreadDot isUnread={true} />
      );

      const dot = container.querySelector('.notification-item__unread-dot');
      expect(dot).toHaveAttribute('role', 'status');
    });
  });

  describe('CSS Classes', () => {
    it('should apply correct CSS class', () => {
      const { container } = render(
        <NotificationUnreadDot isUnread={true} />
      );

      const dot = container.querySelector('.notification-item__unread-dot');
      expect(dot).toHaveClass('notification-item__unread-dot');
    });
  });

  describe('Edge Cases', () => {
    it('should handle isUnread prop changes', () => {
      const { container, rerender } = render(
        <NotificationUnreadDot isUnread={true} />
      );

      let dot = container.querySelector('.notification-item__unread-dot');
      expect(dot).toBeInTheDocument();

      // Change to read
      rerender(<NotificationUnreadDot isUnread={false} />);
      
      dot = container.querySelector('.notification-item__unread-dot');
      expect(dot).not.toBeInTheDocument();
    });

    it('should render with minimal props', () => {
      const { container } = render(
        <NotificationUnreadDot isUnread={true} />
      );

      // Should not throw error
      expect(container.querySelector('.notification-item__unread-dot')).toBeInTheDocument();
    });
  });
});
