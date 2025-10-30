import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeedEndMessage } from './FeedEndMessage';

describe('FeedEndMessage', () => {
  it('renders end message', () => {
    render(<FeedEndMessage />);
    expect(screen.getByText(/You're all caught up!/i)).toBeInTheDocument();
  });

  it('displays emoji/icon', () => {
    const { container } = render(<FeedEndMessage />);
    const icon = container.querySelector('.feed-end__icon');
    expect(icon).toBeInTheDocument();
  });

  it('shows "You\'re all caught up!" text', () => {
    render(<FeedEndMessage />);
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });

  it('has correct CSS classes', () => {
    const { container } = render(<FeedEndMessage />);
    const endDiv = container.querySelector('.feed-end');
    expect(endDiv).toBeInTheDocument();
    expect(endDiv).toHaveClass('feed-end');
  });

  it('matches snapshot', () => {
    const { container } = render(<FeedEndMessage />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('has accessible semantics', () => {
    const { container } = render(<FeedEndMessage />);
    const endDiv = container.querySelector('.feed-end');
    expect(endDiv).toHaveAttribute('role', 'status');
  });

  it('container has test ID', () => {
    render(<FeedEndMessage />);
    expect(screen.getByTestId('feed-end')).toBeInTheDocument();
  });

  it('renders without crashing', () => {
    const { container } = render(<FeedEndMessage />);
    expect(container).toBeInTheDocument();
  });
});
