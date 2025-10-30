/**
 * NotificationContent Component Tests
 *
 * TDD approach: Write tests first
 * Tests the notification content display logic (text, preview, timestamp)
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NotificationContent } from './NotificationContent';

describe('NotificationContent', () => {
  describe('Content Display', () => {
    it('should render notification text', () => {
      render(
        <NotificationContent
          type="like"
          message="John Doe liked your post"
          createdAt={new Date().toISOString()}
          actor={{
            userId: 'user-1',
            handle: 'johndoe',
            displayName: 'John Doe'
          }}
        />
      );

      expect(screen.getByText('John Doe liked your post')).toBeInTheDocument();
    });

    it('should render preview when provided', () => {
      render(
        <NotificationContent
          type="comment"
          message="Sarah commented on your post"
          createdAt={new Date().toISOString()}
          actor={{
            userId: 'user-2',
            handle: 'sarah',
            displayName: 'Sarah'
          }}
          preview="This is the comment preview text"
        />
      );

      expect(screen.getByText('This is the comment preview text')).toBeInTheDocument();
    });

    it('should format timestamp to human readable format', () => {
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

      render(
        <NotificationContent
          type="like"
          message="John liked your post"
          createdAt={fiveMinutesAgo.toISOString()}
          actor={{
            userId: 'user-1',
            handle: 'john',
            displayName: 'John'
          }}
        />
      );

      expect(screen.getByText('5m')).toBeInTheDocument();
    });

    it('should render just now for recent timestamps', () => {
      const now = new Date();

      render(
        <NotificationContent
          type="follow"
          message="Mike started following you"
          createdAt={now.toISOString()}
          actor={{
            userId: 'user-3',
            handle: 'mike',
            displayName: 'Mike'
          }}
        />
      );

      expect(screen.getByText('just now')).toBeInTheDocument();
    });
  });

  describe('CSS Classes', () => {
    it('should apply correct CSS class to text element', () => {
      const { container } = render(
        <NotificationContent
          type="like"
          message="John liked your post"
          createdAt={new Date().toISOString()}
          actor={{
            userId: 'user-1',
            handle: 'john',
            displayName: 'John'
          }}
        />
      );

      const textElement = container.querySelector('.notification-item__text');
      expect(textElement).toBeInTheDocument();
    });

    it('should apply correct CSS class to preview element', () => {
      const { container } = render(
        <NotificationContent
          type="comment"
          message="Sarah commented"
          createdAt={new Date().toISOString()}
          actor={{
            userId: 'user-2',
            handle: 'sarah',
            displayName: 'Sarah'
          }}
          preview="Preview text here"
        />
      );

      const previewElement = container.querySelector('.notification-item__preview');
      expect(previewElement).toBeInTheDocument();
    });

    it('should apply correct CSS class to timestamp element', () => {
      const { container } = render(
        <NotificationContent
          type="like"
          message="John liked your post"
          createdAt={new Date().toISOString()}
          actor={{
            userId: 'user-1',
            handle: 'john',
            displayName: 'John'
          }}
        />
      );

      const timestampElement = container.querySelector('.notification-item__time');
      expect(timestampElement).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should not render preview when not provided', () => {
      const { container } = render(
        <NotificationContent
          type="like"
          message="John liked your post"
          createdAt={new Date().toISOString()}
          actor={{
            userId: 'user-1',
            handle: 'john',
            displayName: 'John'
          }}
        />
      );

      const previewElement = container.querySelector('.notification-item__preview');
      expect(previewElement).not.toBeInTheDocument();
    });

    it('should handle empty preview string', () => {
      const { container } = render(
        <NotificationContent
          type="comment"
          message="Sarah commented"
          createdAt={new Date().toISOString()}
          actor={{
            userId: 'user-2',
            handle: 'sarah',
            displayName: 'Sarah'
          }}
          preview=""
        />
      );

      const previewElement = container.querySelector('.notification-item__preview');
      expect(previewElement).not.toBeInTheDocument();
    });

    it('should render with minimal actor info', () => {
      render(
        <NotificationContent
          type="system"
          message="System notification"
          createdAt={new Date().toISOString()}
          actor={undefined}
        />
      );

      expect(screen.getByText('System notification')).toBeInTheDocument();
    });
  });
});
