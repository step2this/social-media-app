/**
 * NotificationAvatar Component Tests
 *
 * TDD approach: Write tests first
 * Tests the avatar display logic for notifications
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NotificationAvatar } from './NotificationAvatar';

describe('NotificationAvatar', () => {
  describe('Avatar Display', () => {
    it('should render avatar image when avatarUrl is provided', () => {
      render(
        <NotificationAvatar
          avatarUrl="https://example.com/avatar.jpg"
          displayName="John Doe"
          handle="johndoe"
          notificationType="like"
        />
      );

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      expect(img).toHaveAttribute('alt', 'John Doe');
    });

    it('should use handle as alt text when displayName is not provided', () => {
      render(
        <NotificationAvatar
          avatarUrl="https://example.com/avatar.jpg"
          handle="johndoe"
          notificationType="like"
        />
      );

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'johndoe');
    });

    it('should render icon when avatarUrl is not provided', () => {
      render(
        <NotificationAvatar
          notificationType="like"
          handle="johndoe"
        />
      );

      // Should render MaterialIcon instead of img
      const img = screen.queryByRole('img');
      expect(img).not.toBeInTheDocument();

      // Should render the favorite icon for like type
      expect(screen.getByText('favorite')).toBeInTheDocument();
    });

    it('should apply correct CSS class for avatar image', () => {
      render(
        <NotificationAvatar
          avatarUrl="https://example.com/avatar.jpg"
          displayName="John Doe"
          handle="johndoe"
          notificationType="like"
        />
      );

      const img = screen.getByRole('img');
      expect(img).toHaveClass('notification-item__avatar-img');
    });
  });

  describe('Icon Display', () => {
    it('should render correct icon for like notification', () => {
      render(
        <NotificationAvatar
          notificationType="like"
          handle="johndoe"
        />
      );

      expect(screen.getByText('favorite')).toBeInTheDocument();
    });

    it('should render correct icon for comment notification', () => {
      render(
        <NotificationAvatar
          notificationType="comment"
          handle="johndoe"
        />
      );

      expect(screen.getByText('chat_bubble')).toBeInTheDocument();
    });

    it('should render correct icon for follow notification', () => {
      render(
        <NotificationAvatar
          notificationType="follow"
          handle="johndoe"
        />
      );

      expect(screen.getByText('person_add')).toBeInTheDocument();
    });

    it('should render correct icon for mention notification', () => {
      render(
        <NotificationAvatar
          notificationType="mention"
          handle="johndoe"
        />
      );

      expect(screen.getByText('alternate_email')).toBeInTheDocument();
    });

    it('should apply correct color class for like notification', () => {
      const { container } = render(
        <NotificationAvatar
          notificationType="like"
          handle="johndoe"
        />
      );

      const iconContainer = container.querySelector('.notification-item__icon');
      expect(iconContainer).toHaveClass('notification-icon--like');
    });

    it('should apply correct color class for comment notification', () => {
      const { container } = render(
        <NotificationAvatar
          notificationType="comment"
          handle="johndoe"
        />
      );

      const iconContainer = container.querySelector('.notification-item__icon');
      expect(iconContainer).toHaveClass('notification-icon--comment');
    });

    it('should apply correct color class for follow notification', () => {
      const { container } = render(
        <NotificationAvatar
          notificationType="follow"
          handle="johndoe"
        />
      );

      const iconContainer = container.querySelector('.notification-item__icon');
      expect(iconContainer).toHaveClass('notification-icon--follow');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing all actor information gracefully', () => {
      render(
        <NotificationAvatar
          notificationType="system"
        />
      );

      // Should still render icon for system notification
      expect(screen.getByText('info')).toBeInTheDocument();
    });

    it('should render with minimal props', () => {
      render(
        <NotificationAvatar
          notificationType="like"
        />
      );

      // Should not throw error
      expect(screen.getByText('favorite')).toBeInTheDocument();
    });
  });
});
