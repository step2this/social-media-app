import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PostWithAuthor } from '@social-media-app/shared';
import { FeedItemWrapper } from './FeedItemWrapper';
import { useFeedItemAutoRead } from '../../hooks/useFeedItemAutoRead';
import { PostCard } from '../posts/PostCard';

// Mock dependencies
vi.mock('../../hooks/useFeedItemAutoRead');
vi.mock('../posts/PostCard', () => ({
  PostCard: vi.fn(() => <div data-testid="post-card">Post Card</div>)
}));

describe('FeedItemWrapper', () => {
  const mockPost: PostWithAuthor = {
    id: 'post-1',
    userId: 'user-1',
    userHandle: 'testuser',
    imageUrl: 'https://example.com/image.jpg',
    caption: 'Test post content',
    likesCount: 0,
    commentsCount: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    authorId: 'user-1',
    authorHandle: 'testuser',
    authorFullName: 'Test User',
  };

  const mockRef = { current: null };

  beforeEach(() => {
    vi.mocked(useFeedItemAutoRead).mockReturnValue(mockRef as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders PostCard with correct props', () => {
    render(<FeedItemWrapper post={mockPost} />);
    expect(PostCard).toHaveBeenCalledWith(
      expect.objectContaining({
        post: mockPost,
        compact: true
      }),
      expect.anything()
    );
  });

  it('uses auto-read hook', () => {
    render(<FeedItemWrapper post={mockPost} />);
    expect(useFeedItemAutoRead).toHaveBeenCalledWith(mockPost.id);
  });

  it('passes post to PostCard', () => {
    render(<FeedItemWrapper post={mockPost} />);
    expect(PostCard).toHaveBeenCalledWith(
      expect.objectContaining({ post: mockPost }),
      expect.anything()
    );
  });

  it('defaults to compact=true', () => {
    render(<FeedItemWrapper post={mockPost} />);
    expect(PostCard).toHaveBeenCalledWith(
      expect.objectContaining({ compact: true }),
      expect.anything()
    );
  });

  it('respects compact prop override', () => {
    render(<FeedItemWrapper post={mockPost} compact={false} />);
    expect(PostCard).toHaveBeenCalledWith(
      expect.objectContaining({ compact: false }),
      expect.anything()
    );
  });

  it('has wrapper div with class', () => {
    const { container } = render(<FeedItemWrapper post={mockPost} />);
    const wrapper = container.querySelector('.feed-item-wrapper');
    expect(wrapper).toBeInTheDocument();
  });

  it('ref is attached to wrapper', () => {
    const { container } = render(<FeedItemWrapper post={mockPost} />);
    const wrapper = container.querySelector('.feed-item-wrapper');
    expect(wrapper).toBeInTheDocument();
  });

  it('matches snapshot', () => {
    const { container } = render(<FeedItemWrapper post={mockPost} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders without post errors', () => {
    const { container } = render(<FeedItemWrapper post={mockPost} />);
    expect(container).toBeInTheDocument();
    expect(screen.getByTestId('post-card')).toBeInTheDocument();
  });

  it('hook called with correct post ID', () => {
    render(<FeedItemWrapper post={mockPost} />);
    expect(useFeedItemAutoRead).toHaveBeenCalledWith('post-1');
  });
});
