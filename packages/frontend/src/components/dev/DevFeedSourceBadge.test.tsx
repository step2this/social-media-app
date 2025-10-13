import { render, screen } from '@testing-library/react';
import { DevFeedSourceBadge } from './DevFeedSourceBadge';

describe('DevFeedSourceBadge', () => {
  test('displays M badge for materialized posts', () => {
    render(<DevFeedSourceBadge feedSource="materialized" />);
    expect(screen.getByText('M')).toBeInTheDocument();
  });

  test('displays Q badge for query-time posts', () => {
    render(<DevFeedSourceBadge feedSource="query-time" />);
    expect(screen.getByText('Q')).toBeInTheDocument();
  });

  test('applies blue background for materialized', () => {
    const { container } = render(<DevFeedSourceBadge feedSource="materialized" />);
    const badge = container.firstChild;
    expect(badge).toHaveClass('dev-feed-source-badge--materialized');
  });

  test('applies yellow background for query-time', () => {
    const { container } = render(<DevFeedSourceBadge feedSource="query-time" />);
    const badge = container.firstChild;
    expect(badge).toHaveClass('dev-feed-source-badge--query-time');
  });

  test('renders as absolute positioned overlay', () => {
    const { container } = render(<DevFeedSourceBadge feedSource="materialized" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass('dev-feed-source-badge');
  });

  test('has base badge class applied', () => {
    const { container } = render(<DevFeedSourceBadge feedSource="materialized" />);
    const badge = container.firstChild;
    expect(badge).toHaveClass('dev-feed-source-badge');
  });

  test('combines base and modifier classes', () => {
    const { container } = render(<DevFeedSourceBadge feedSource="query-time" />);
    const badge = container.firstChild;
    expect(badge).toHaveClass('dev-feed-source-badge');
    expect(badge).toHaveClass('dev-feed-source-badge--query-time');
  });
});