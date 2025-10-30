import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PostWithAuthor } from '@social-media-app/shared';
import { FeedList } from './FeedList';
import { FeedItemWrapper } from './FeedItemWrapper';

// Mock FeedItemWrapper
vi.mock('./FeedItemWrapper', () => ({
  FeedItemWrapper: vi.fn(({ post }) => (
    <div data-testid={`feed-item-${post.id}`}>Feed Item {post.id}</div>
  ))
}));

describe('FeedList', () => {
  const mockPosts: PostWithAuthor[] = [
    {
      id: 'post-1',
      userId: 'user-1',
      userHandle: 'user1',
      imageUrl: 'https://example.com/image1.jpg',
      caption: 'First post',
      likesCount: 0,
      commentsCount: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
      authorId: 'user-1',
      authorHandle: 'user1',
      authorFullName: 'User One',
    },
    {
      id: 'post-2',
      userId: 'user-2',
      userHandle: 'user2',
      imageUrl: 'https://example.com/image2.jpg',
      caption: 'Second post',
      likesCount: 0,
      commentsCount: 0,
      createdAt: '2024-01-02T00:00:00.000Z',
      authorId: 'user-2',
      authorHandle: 'user2',
      authorFullName: 'User Two',
    }
  ];

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty list', () => {
    render(<FeedList posts={[]} />);
    const list = screen.getByTestId('feed-list');
    expect(list).toBeInTheDocument();
    expect(list.children).toHaveLength(0);
  });

  it('renders single post', () => {
    render(<FeedList posts={[mockPosts[0]]} />);
    expect(screen.getByTestId('feed-item-post-1')).toBeInTheDocument();
  });

  it('renders multiple posts', () => {
    render(<FeedList posts={mockPosts} />);
    expect(screen.getByTestId('feed-item-post-1')).toBeInTheDocument();
    expect(screen.getByTestId('feed-item-post-2')).toBeInTheDocument();
  });

  it('each post has FeedItemWrapper', () => {
    render(<FeedList posts={mockPosts} />);
    expect(FeedItemWrapper).toHaveBeenCalledTimes(2);
  });

  it('passes compact prop to items', () => {
    render(<FeedList posts={[mockPosts[0]]} compact={false} />);
    expect(FeedItemWrapper).toHaveBeenCalledWith(
      expect.objectContaining({
        post: mockPosts[0],
        compact: false
      }),
      expect.anything()
    );
  });

  it('uses post.id as key', () => {
    const { container } = render(<FeedList posts={mockPosts} />);
    const items = container.querySelectorAll('[data-testid^="feed-item-"]');
    expect(items[0]).toHaveAttribute('data-testid', 'feed-item-post-1');
    expect(items[1]).toHaveAttribute('data-testid', 'feed-item-post-2');
  });

  it('has feed-list class', () => {
    const { container } = render(<FeedList posts={mockPosts} />);
    const list = container.querySelector('.feed-list');
    expect(list).toBeInTheDocument();
  });

  it('matches snapshot (empty)', () => {
    const { container } = render(<FeedList posts={[]} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot (with posts)', () => {
    const { container } = render(<FeedList posts={mockPosts} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders without crashing', () => {
    const { container } = render(<FeedList posts={mockPosts} />);
    expect(container).toBeInTheDocument();
  });
});
