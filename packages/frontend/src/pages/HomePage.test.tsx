import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HomePage } from './HomePage';
import * as feedService from '../services/feedService';
import type { FeedPostItem } from '@social-media-app/shared';

// Mock feedService
vi.mock('../services/feedService', () => ({
  feedService: {
    getFollowingFeed: vi.fn()
  }
}));

// Mock PostCard component to verify it's being used instead of FeedPostCard
vi.mock('../components/posts/PostCard', () => ({
  PostCard: ({ post }: any) => (
    <div data-testid="post-card-mock">
      <div data-testid="post-card-id">{post.id}</div>
      <div data-testid="post-card-handle">{post.userHandle}</div>
    </div>
  )
}));

const mockFeedPosts: FeedPostItem[] = [
  {
    id: 'post-1',
    userId: 'user-1',
    userHandle: 'user1',
    authorHandle: 'user1',
    caption: 'First post',
    tags: ['test'],
    imageUrl: 'https://example.com/1.jpg',
    likesCount: 10,
    commentsCount: 2,
    createdAt: '2025-10-09T10:00:00Z',
    updatedAt: '2025-10-09T10:00:00Z',
    isLiked: false
  },
  {
    id: 'post-2',
    userId: 'user-2',
    userHandle: 'user2',
    authorHandle: 'user2',
    caption: 'Second post',
    tags: ['vitest'],
    imageUrl: 'https://example.com/2.jpg',
    likesCount: 5,
    commentsCount: 1,
    createdAt: '2025-10-09T11:00:00Z',
    updatedAt: '2025-10-09T11:00:00Z',
    isLiked: true
  }
];

const renderHomePage = () => render(
    <BrowserRouter>
      <HomePage />
    </BrowserRouter>
  );

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PostCard Integration (TDD Refactor)', () => {
    it('should use PostCard component instead of FeedPostCard', async () => {
      vi.mocked(feedService.feedService.getFollowingFeed).mockResolvedValue({
        posts: mockFeedPosts,
        nextCursor: undefined,
        hasMore: false
      });

      renderHomePage();

      await waitFor(() => {
        expect(screen.getAllByTestId('post-card-mock')).toHaveLength(2);
      });

      // Verify PostCard is rendering with correct data
      const postIds = screen.getAllByTestId('post-card-id');
      expect(postIds[0]).toHaveTextContent('post-1');
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    it('should NOT use FeedPostCard component', async () => {
      vi.mocked(feedService.feedService.getFollowingFeed).mockResolvedValue({
        posts: mockFeedPosts,
        nextCursor: undefined,
        hasMore: false
      });

      renderHomePage();

      await waitFor(() => {
        expect(screen.getAllByTestId('post-card-mock')).toHaveLength(2);
      });

      // FeedPostCard uses .feed-post-card class, PostCard uses .post-card
      const container = document.querySelector('.home-page__feed');
      expect(container?.querySelector('.feed-post-card')).not.toBeInTheDocument();
    });

    it('should pass all feed posts to PostCard components', async () => {
      vi.mocked(feedService.feedService.getFollowingFeed).mockResolvedValue({
        posts: mockFeedPosts,
        nextCursor: undefined,
        hasMore: false
      });

      renderHomePage();

      await waitFor(() => {
        expect(screen.getAllByTestId('post-card-mock')).toHaveLength(2);
      });

      // Verify both posts are rendered
      expect(screen.getByText('user1')).toBeInTheDocument();
      expect(screen.getByText('user2')).toBeInTheDocument();
    });
  });
});
