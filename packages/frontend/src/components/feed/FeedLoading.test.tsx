import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeedLoading } from './FeedLoading';

describe('FeedLoading', () => {
  it('renders loading spinner', () => {
    const { container } = render(<FeedLoading />);
    const spinner = container.querySelector('.feed-loading__spinner');
    expect(spinner).toBeInTheDocument();
  });

  it('displays "Loading your feed..." message', () => {
    render(<FeedLoading />);
    expect(screen.getByText('Loading your feed...')).toBeInTheDocument();
  });

  it('has correct CSS classes', () => {
    const { container } = render(<FeedLoading />);
    const feedLoading = container.querySelector('.feed-loading');
    expect(feedLoading).toBeInTheDocument();
    expect(feedLoading).toHaveClass('feed-loading');
  });

  it('matches snapshot', () => {
    const { container } = render(<FeedLoading />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('has accessible aria-live region', () => {
    const { container } = render(<FeedLoading />);
    const feedLoading = container.querySelector('.feed-loading');
    expect(feedLoading).toHaveAttribute('aria-live', 'polite');
  });

  it('spinner has aria-label', () => {
    const { container } = render(<FeedLoading />);
    const spinner = container.querySelector('.feed-loading__spinner');
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });

  it('container has test ID', () => {
    render(<FeedLoading />);
    expect(screen.getByTestId('feed-loading')).toBeInTheDocument();
  });

  it('renders without crashing', () => {
    const { container } = render(<FeedLoading />);
    expect(container).toBeInTheDocument();
  });
});
