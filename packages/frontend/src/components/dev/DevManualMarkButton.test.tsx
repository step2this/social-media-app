import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { DevManualMarkButton } from './DevManualMarkButton';
import { feedService } from '../../services/feedService';

vi.mock('../../services/feedService');

describe('DevManualMarkButton', () => {
  const mockPost = {
    id: 'post-1',
    userId: 'user-1',
    userHandle: 'alice',
    caption: 'Test post',
    mediaUrl: 'https://example.com/1.jpg',
    createdAt: '2025-01-01T00:00:00Z',
    isRead: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders button with post ID', () => {
    render(<DevManualMarkButton post={mockPost} />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button.textContent).toContain('post-1');
  });

  test('calls markPostsAsRead on click', async () => {
    vi.mocked(feedService.markPostsAsRead).mockResolvedValue({ success: true });

    render(<DevManualMarkButton post={mockPost} />);
    const button = screen.getByRole('button');

    fireEvent.click(button);

    await waitFor(() => {
      expect(feedService.markPostsAsRead).toHaveBeenCalledWith(['post-1']);
    });
  });

  test('shows pending state during API call', async () => {
    let resolveMark: (value: any) => void;
    const markPromise = new Promise((resolve) => {
      resolveMark = resolve;
    });

    vi.mocked(feedService.markPostsAsRead).mockReturnValue(markPromise as any);

    render(<DevManualMarkButton post={mockPost} />);
    const button = screen.getByRole('button');

    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
      expect(button.textContent).toContain('Marking');
    });

    resolveMark!({ success: true });
    await markPromise;
  });

  test('displays success message after marking', async () => {
    vi.mocked(feedService.markPostsAsRead).mockResolvedValue({ success: true });

    render(<DevManualMarkButton post={mockPost} />);
    const button = screen.getByRole('button');

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/marked as read/i)).toBeInTheDocument();
    });
  });

  test('displays error message on failure', async () => {
    vi.mocked(feedService.markPostsAsRead).mockRejectedValue(
      new Error('Network error')
    );

    render(<DevManualMarkButton post={mockPost} />);
    const button = screen.getByRole('button');

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });

  test('disables button while pending', async () => {
    let resolveMark: (value: any) => void;
    const markPromise = new Promise((resolve) => {
      resolveMark = resolve;
    });

    vi.mocked(feedService.markPostsAsRead).mockReturnValue(markPromise as any);

    render(<DevManualMarkButton post={mockPost} />);
    const button = screen.getByRole('button');

    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
    });

    // Try clicking again while disabled
    fireEvent.click(button);

    // Should still only be called once
    expect(feedService.markPostsAsRead).toHaveBeenCalledTimes(1);

    resolveMark!({ success: true });
    await markPromise;
  });

  test('calls onMarkComplete callback on success', async () => {
    vi.mocked(feedService.markPostsAsRead).mockResolvedValue({ success: true });
    const onMarkComplete = vi.fn();

    render(<DevManualMarkButton post={mockPost} onMarkComplete={onMarkComplete} />);
    const button = screen.getByRole('button');

    fireEvent.click(button);

    await waitFor(() => {
      expect(onMarkComplete).toHaveBeenCalledTimes(1);
    });
  });

  test('does not call onMarkComplete on error', async () => {
    vi.mocked(feedService.markPostsAsRead).mockRejectedValue(
      new Error('Network error')
    );
    const onMarkComplete = vi.fn();

    render(<DevManualMarkButton post={mockPost} onMarkComplete={onMarkComplete} />);
    const button = screen.getByRole('button');

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });

    expect(onMarkComplete).not.toHaveBeenCalled();
  });

  test('shows spinner icon during pending state', async () => {
    let resolveMark: (value: any) => void;
    const markPromise = new Promise((resolve) => {
      resolveMark = resolve;
    });

    vi.mocked(feedService.markPostsAsRead).mockReturnValue(markPromise as any);

    const { container } = render(<DevManualMarkButton post={mockPost} />);
    const button = screen.getByRole('button');

    fireEvent.click(button);

    await waitFor(() => {
      const spinner = container.querySelector('.dev-manual-mark-button__spinner');
      expect(spinner).toBeInTheDocument();
    });

    resolveMark!({ success: true });
    await markPromise;
  });
});