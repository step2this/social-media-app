import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeedLoadingMore } from './FeedLoadingMore';

describe('FeedLoadingMore', () => {
  it('shows spinner when loading=true', () => {
    const { container } = render(<FeedLoadingMore loading={true} />);
    const spinner = container.querySelector('.spinner');
    expect(spinner).toBeInTheDocument();
  });

  it('hides spinner when loading=false', () => {
    const { container } = render(<FeedLoadingMore loading={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('displays "Loading more..." text when loading', () => {
    render(<FeedLoadingMore loading={true} />);
    expect(screen.getByText('Loading more...')).toBeInTheDocument();
  });

  it('has correct CSS classes when loading', () => {
    const { container } = render(<FeedLoadingMore loading={true} />);
    const loadingDiv = container.querySelector('.feed-loading-more');
    expect(loadingDiv).toBeInTheDocument();
    expect(loadingDiv).toHaveClass('feed-loading-more');
  });

  it('matches snapshot (loading state)', () => {
    const { container } = render(<FeedLoadingMore loading={true} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot (not loading state)', () => {
    const { container } = render(<FeedLoadingMore loading={false} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('has accessible aria-live region when loading', () => {
    const { container } = render(<FeedLoadingMore loading={true} />);
    const loadingDiv = container.querySelector('.feed-loading-more');
    expect(loadingDiv).toHaveAttribute('aria-live', 'polite');
  });

  it('renders without crashing', () => {
    const { container } = render(<FeedLoadingMore loading={false} />);
    expect(container).toBeInTheDocument();
  });
});
