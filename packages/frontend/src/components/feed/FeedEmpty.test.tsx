import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeedEmpty } from './FeedEmpty';

describe('FeedEmpty', () => {
  it('renders empty state message', () => {
    render(<FeedEmpty />);
    expect(
      screen.getByText(/No posts yet! Follow some users to see their posts here./i)
    ).toBeInTheDocument();
  });

  it('displays emoji/icon', () => {
    const { container } = render(<FeedEmpty />);
    const icon = container.querySelector('.feed-empty__icon');
    expect(icon).toBeInTheDocument();
  });

  it('shows helpful text', () => {
    render(<FeedEmpty />);
    const helpText = screen.getByText(/follow some users/i);
    expect(helpText).toBeInTheDocument();
  });

  it('has correct CSS classes', () => {
    const { container } = render(<FeedEmpty />);
    const emptyDiv = container.querySelector('.feed-empty');
    expect(emptyDiv).toBeInTheDocument();
    expect(emptyDiv).toHaveClass('feed-empty');
  });

  it('matches snapshot', () => {
    const { container } = render(<FeedEmpty />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('has accessible semantics', () => {
    const { container } = render(<FeedEmpty />);
    const emptyDiv = container.querySelector('.feed-empty');
    expect(emptyDiv).toHaveAttribute('role', 'status');
  });

  it('container has test ID', () => {
    render(<FeedEmpty />);
    expect(screen.getByTestId('feed-empty')).toBeInTheDocument();
  });

  it('renders without crashing', () => {
    const { container } = render(<FeedEmpty />);
    expect(container).toBeInTheDocument();
  });
});
