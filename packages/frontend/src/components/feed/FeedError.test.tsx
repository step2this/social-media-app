import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeedError } from './FeedError';

describe('FeedError', () => {
  const mockOnRetry = vi.fn();
  const defaultMessage = 'Something went wrong';

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders error message', () => {
    render(<FeedError message={defaultMessage} onRetry={mockOnRetry} />);
    expect(screen.getByText(defaultMessage)).toBeInTheDocument();
  });

  it('displays custom error message prop', () => {
    const customMessage = 'Failed to load feed';
    render(<FeedError message={customMessage} onRetry={mockOnRetry} />);
    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it('shows retry button', () => {
    render(<FeedError message={defaultMessage} onRetry={mockOnRetry} />);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('calls onRetry when button clicked', () => {
    render(<FeedError message={defaultMessage} onRetry={mockOnRetry} />);
    const button = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(button);
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('has correct CSS classes', () => {
    const { container } = render(<FeedError message={defaultMessage} onRetry={mockOnRetry} />);
    const errorDiv = container.querySelector('.feed-error');
    expect(errorDiv).toBeInTheDocument();
    expect(errorDiv).toHaveClass('feed-error');
  });

  it('matches snapshot', () => {
    const { container } = render(<FeedError message={defaultMessage} onRetry={mockOnRetry} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('has accessible role alert', () => {
    const { container } = render(<FeedError message={defaultMessage} onRetry={mockOnRetry} />);
    const errorDiv = container.querySelector('.feed-error');
    expect(errorDiv).toHaveAttribute('role', 'alert');
  });

  it('retry button has correct text', () => {
    render(<FeedError message={defaultMessage} onRetry={mockOnRetry} />);
    const button = screen.getByRole('button', { name: /try again/i });
    expect(button).toHaveTextContent('Try Again');
  });

  it('error icon displays', () => {
    const { container } = render(<FeedError message={defaultMessage} onRetry={mockOnRetry} />);
    const icon = container.querySelector('.feed-error__icon');
    expect(icon).toBeInTheDocument();
  });

  it('renders without crashing', () => {
    const { container } = render(<FeedError message={defaultMessage} onRetry={mockOnRetry} />);
    expect(container).toBeInTheDocument();
  });
});
