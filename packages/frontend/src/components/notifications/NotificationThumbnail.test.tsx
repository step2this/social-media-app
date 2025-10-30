/**
 * NotificationThumbnail Component Tests
 *
 * TDD approach: Write tests first
 * Tests the thumbnail display logic for post-related notifications
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NotificationThumbnail } from './NotificationThumbnail';

describe('NotificationThumbnail', () => {
  describe('Thumbnail Display', () => {
    it('should render thumbnail image with correct src', () => {
      render(
        <NotificationThumbnail
          thumbnailUrl="https://example.com/thumbnail.jpg"
        />
      );

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/thumbnail.jpg');
    });

    it('should use altText when provided', () => {
      render(
        <NotificationThumbnail
          thumbnailUrl="https://example.com/thumbnail.jpg"
          altText="Post preview"
        />
      );

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'Post preview');
    });

    it('should use default alt text when not provided', () => {
      render(
        <NotificationThumbnail
          thumbnailUrl="https://example.com/thumbnail.jpg"
        />
      );

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'Post thumbnail');
    });

    it('should apply correct CSS class to image', () => {
      render(
        <NotificationThumbnail
          thumbnailUrl="https://example.com/thumbnail.jpg"
        />
      );

      const img = screen.getByRole('img');
      expect(img).toHaveClass('notification-item__thumbnail-img');
    });

    it('should wrap image in correct container', () => {
      const { container } = render(
        <NotificationThumbnail
          thumbnailUrl="https://example.com/thumbnail.jpg"
        />
      );

      const thumbnailContainer = container.querySelector('.notification-item__thumbnail');
      expect(thumbnailContainer).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long URLs', () => {
      const longUrl = `https://example.com/${'very-long-path/'.repeat(50)}thumbnail.jpg`;

      render(
        <NotificationThumbnail
          thumbnailUrl={longUrl}
        />
      );

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', longUrl);
    });

    it('should handle special characters in altText', () => {
      render(
        <NotificationThumbnail
          thumbnailUrl="https://example.com/thumbnail.jpg"
          altText="Post with special chars: @#$%"
        />
      );

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'Post with special chars: @#$%');
    });

    it('should render with minimal props', () => {
      render(
        <NotificationThumbnail
          thumbnailUrl="https://example.com/thumbnail.jpg"
        />
      );

      // Should not throw error
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });
});
