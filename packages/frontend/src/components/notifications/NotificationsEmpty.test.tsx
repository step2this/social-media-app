/**
 * NotificationsEmpty Component Tests
 * 
 * TDD approach: Write tests first
 * Tests the empty state display component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NotificationsEmpty } from './NotificationsEmpty';

describe('NotificationsEmpty', () => {
  describe('Rendering', () => {
    it('should render empty message', () => {
      render(<NotificationsEmpty />);

      expect(screen.getByText('No notifications')).toBeInTheDocument();
    });

    it('should render default subtext', () => {
      render(<NotificationsEmpty />);

      expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
    });

    it('should render custom message when provided', () => {
      render(<NotificationsEmpty message="Custom empty message" />);

      expect(screen.getByText('Custom empty message')).toBeInTheDocument();
    });

    it('should apply correct CSS class to container', () => {
      const { container } = render(<NotificationsEmpty />);

      expect(container.querySelector('.notifications-page__empty')).toBeInTheDocument();
    });

    it('should render icon element', () => {
      const { container } = render(<NotificationsEmpty />);

      const icon = container.querySelector('.notifications-page__empty-icon');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string message', () => {
      render(<NotificationsEmpty message="" />);

      // Should fall back to default message
      expect(screen.getByText('No notifications')).toBeInTheDocument();
    });

    it('should handle very long custom messages', () => {
      const longMessage = 'This is a very long custom message that might wrap to multiple lines in the UI '.repeat(3).trim();
      
      render(<NotificationsEmpty message={longMessage} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should render with minimal props', () => {
      render(<NotificationsEmpty />);

      expect(screen.getByText('No notifications')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      const { container } = render(<NotificationsEmpty />);

      const emptyDiv = container.querySelector('.notifications-page__empty');
      expect(emptyDiv).toBeInTheDocument();
    });
  });
});
