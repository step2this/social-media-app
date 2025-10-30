/**
 * NotificationsLoading Component Tests
 * 
 * TDD approach: Write tests first
 * Tests the loading state display component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NotificationsLoading } from './NotificationsLoading';

describe('NotificationsLoading', () => {
  describe('Rendering', () => {
    it('should render loading message', () => {
      render(<NotificationsLoading />);

      expect(screen.getByText('Loading notifications...')).toBeInTheDocument();
    });

    it('should render loading spinner', () => {
      const { container } = render(<NotificationsLoading />);

      const spinner = container.querySelector('.notifications-page__loading-spinner');
      expect(spinner).toBeInTheDocument();
    });

    it('should apply correct CSS class to container', () => {
      const { container } = render(<NotificationsLoading />);

      expect(container.querySelector('.notifications-page__loading')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const { container } = render(<NotificationsLoading />);

      const loadingDiv = container.querySelector('.notifications-page__loading');
      expect(loadingDiv).toHaveAttribute('role', 'status');
      expect(loadingDiv).toHaveAttribute('aria-live', 'polite');
      expect(loadingDiv).toHaveAttribute('aria-busy', 'true');
    });
  });
});
