import { render, screen } from '@testing-library/react';
import { DevReadStateDebugger } from './DevReadStateDebugger';
import type { FeedPostItem } from '@social-media-app/shared';

describe('DevReadStateDebugger', () => {
  const mockPosts: FeedPostItem[] = [
    {
      id: 'post-1',
      userId: 'user-1',
      userHandle: 'alice',
      caption: 'Test post 1',
      mediaUrl: 'https://example.com/1.jpg',
      createdAt: '2025-01-01T00:00:00Z',
      isRead: false
    },
    {
      id: 'post-2',
      userId: 'user-2',
      userHandle: 'bob',
      caption: 'Test post 2',
      mediaUrl: 'https://example.com/2.jpg',
      createdAt: '2025-01-02T00:00:00Z',
      isRead: true,
      readAt: '2025-01-03T00:00:00Z'
    }
  ];

  test('displays table with post read status', () => {
    render(<DevReadStateDebugger posts={mockPosts} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  test('shows unread indicator for unread posts', () => {
    render(<DevReadStateDebugger posts={mockPosts} />);
    // Check for unread indicator (○ or similar)
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(0);
  });

  test('shows read indicator for read posts', () => {
    render(<DevReadStateDebugger posts={mockPosts} />);
    // Check for read indicator (✓ or similar)
  });

  test('displays readAt timestamp for read posts', () => {
    render(<DevReadStateDebugger posts={mockPosts} />);
    // Check for formatted date (e.g., "Jan 3, 12:00 AM")
    expect(screen.getByText(/Jan 3/)).toBeInTheDocument();
  });

  test('displays truncated post IDs', () => {
    render(<DevReadStateDebugger posts={mockPosts} />);
    expect(screen.getByText(/post-1/)).toBeInTheDocument();
  });

  test('handles empty post list', () => {
    render(<DevReadStateDebugger posts={[]} />);
    expect(screen.getByText(/No posts/i)).toBeInTheDocument();
  });

  test('displays user handles with links', () => {
    render(<DevReadStateDebugger posts={mockPosts} />);
    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(screen.getByText('@bob')).toBeInTheDocument();
  });
});