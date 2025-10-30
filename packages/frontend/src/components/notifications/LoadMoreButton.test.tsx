/**
 * LoadMoreButton Component Tests
 *
 * TDD approach: Write tests first
 * Tests the load more button with loading state handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoadMoreButton } from './LoadMoreButton';

describe('LoadMoreButton', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  describe('Rendering', () => {
    it('should render load more button', () => {
      render(
        <LoadMoreButton
          onClick={mockOnClick}
          loading={false}
        />
      );

      expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
    });

    it('should render "Load more" text when not loading', () => {
      render(
        <LoadMoreButton
          onClick={mockOnClick}
          loading={false}
        />
      );

      expect(screen.getByText('Load more')).toBeInTheDocument();
    });

    it('should render "Loading..." text when loading', () => {
      render(
        <LoadMoreButton
          onClick={mockOnClick}
          loading={true}
        />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should apply correct CSS class to container', () => {
      const { container } = render(
        <LoadMoreButton
          onClick={mockOnClick}
          loading={false}
        />
      );

      expect(container.querySelector('.notifications-page__load-more')).toBeInTheDocument();
    });

    it('should apply correct CSS class to button', () => {
      const { container } = render(
        <LoadMoreButton
          onClick={mockOnClick}
          loading={false}
        />
      );

      expect(container.querySelector('.notifications-page__load-more-btn')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClick when button is clicked', () => {
      render(
        <LoadMoreButton
          onClick={mockOnClick}
          loading={false}
        />
      );

      const button = screen.getByRole('button', { name: /load more/i });
      fireEvent.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when button is disabled', () => {
      render(
        <LoadMoreButton
          onClick={mockOnClick}
          loading={true}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('should allow multiple clicks when not loading', () => {
      render(
        <LoadMoreButton
          onClick={mockOnClick}
          loading={false}
        />
      );

      const button = screen.getByRole('button', { name: /load more/i });
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(3);
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when loading', () => {
      render(
        <LoadMoreButton
          onClick={mockOnClick}
          loading={true}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should not be disabled when not loading', () => {
      render(
        <LoadMoreButton
          onClick={mockOnClick}
          loading={false}
        />
      );

      const button = screen.getByRole('button', { name: /load more/i });
      expect(button).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have button role', () => {
      render(
        <LoadMoreButton
          onClick={mockOnClick}
          loading={false}
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      render(
        <LoadMoreButton
          onClick={mockOnClick}
          loading={false}
        />
      );

      const button = screen.getByRole('button', { name: /load more/i });
      button.focus();
      expect(button).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid state changes', () => {
      const { rerender } = render(
        <LoadMoreButton
          onClick={mockOnClick}
          loading={false}
        />
      );

      expect(screen.getByText('Load more')).toBeInTheDocument();

      rerender(
        <LoadMoreButton
          onClick={mockOnClick}
          loading={true}
        />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      rerender(
        <LoadMoreButton
          onClick={mockOnClick}
          loading={false}
        />
      );

      expect(screen.getByText('Load more')).toBeInTheDocument();
    });

    it('should render with minimal props', () => {
      render(
        <LoadMoreButton
          onClick={mockOnClick}
          loading={false}
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});
