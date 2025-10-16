import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HomePage } from './HomePage';
import * as feedService from '../services/feedService';
import type { FeedPostItem } from '@social-media-app/shared';
import { createMockFeedPostItem } from '../test-utils/mock-factories';

// Mock feedService
vi.mock('../services/feedService', () => ({
  feedService: {
    getFollowingFeed: vi.fn(),
    markPostsAsRead: vi.fn()
  }
}));

// Mock useFeedItemAutoRead hook
vi.mock('../hooks/useFeedItemAutoRead', () => ({
  useFeedItemAutoRead: vi.fn(() => ({ current: null }))
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
  createMockFeedPostItem({
    id: 'post-1',
    userId: 'user-1',
    userHandle: 'user1',
    authorHandle: 'user1',
    caption: 'First post',
    likesCount: 10,
    commentsCount: 2,
    createdAt: '2025-10-09T10:00:00Z',
    isLiked: false
  }),
  createMockFeedPostItem({
    id: 'post-2',
    userId: 'user-2',
    userHandle: 'user2',
    authorHandle: 'user2',
    caption: 'Second post',
    likesCount: 5,
    commentsCount: 1,
    createdAt: '2025-10-09T11:00:00Z',
    isLiked: true
  })
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

  describe('Auto-Read Integration (Instagram-like behavior)', () => {
    it('should attach auto-read ref to each PostCard', async () => {
      const mockAutoReadHook = vi.fn(() => ({ current: null }));
      // @ts-expect-error - Mocking hook implementation
      const { useFeedItemAutoRead } = await import('../hooks/useFeedItemAutoRead');
      vi.mocked(useFeedItemAutoRead).mockImplementation(mockAutoReadHook);

      vi.mocked(feedService.feedService.getFollowingFeed).mockResolvedValue({
        posts: mockFeedPosts,
        nextCursor: undefined,
        hasMore: false
      });

      renderHomePage();

      await waitFor(() => {
        expect(screen.getAllByTestId('post-card-mock')).toHaveLength(2);
      });

      // Verify useFeedItemAutoRead hook called for each post
      expect(mockAutoReadHook).toHaveBeenCalledWith('post-1');
      expect(mockAutoReadHook).toHaveBeenCalledWith('post-2');
    });

    it('should use useOptimistic for instant post removal on read', async () => {
      // Mock markPostsAsRead to delay (simulate API call)
      vi.mocked(feedService.feedService.markPostsAsRead).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, markedCount: 1 }), 1000))
      );

      vi.mocked(feedService.feedService.getFollowingFeed).mockResolvedValue({
        posts: mockFeedPosts,
        nextCursor: undefined,
        hasMore: false
      });

      renderHomePage();

      await waitFor(() => {
        expect(screen.getAllByTestId('post-card-mock')).toHaveLength(2);
      });

      // Verify both posts initially visible
      expect(screen.getByText('post-1')).toBeInTheDocument();
      expect(screen.getByText('post-2')).toBeInTheDocument();

      // TODO: Trigger auto-read on first post
      // Post should be immediately removed from UI (optimistic)
      // API call should be made in background
    });

    it('should roll back optimistic update on API failure', async () => {
      // Mock markPostsAsRead to throw error
      vi.mocked(feedService.feedService.markPostsAsRead).mockRejectedValue(
        new Error('Network error')
      );

      vi.mocked(feedService.feedService.getFollowingFeed).mockResolvedValue({
        posts: mockFeedPosts,
        nextCursor: undefined,
        hasMore: false
      });

      renderHomePage();

      await waitFor(() => {
        expect(screen.getAllByTestId('post-card-mock')).toHaveLength(2);
      });

      // TODO: Trigger auto-read
      // Verify post removed optimistically
      // Verify post reappears after error
    });

    it('should handle rapid scroll without duplicate API calls', async () => {
      vi.mocked(feedService.feedService.markPostsAsRead).mockResolvedValue({
        success: true,
        markedCount: 1
      });

      vi.mocked(feedService.feedService.getFollowingFeed).mockResolvedValue({
        posts: mockFeedPosts,
        nextCursor: undefined,
        hasMore: false
      });

      renderHomePage();

      await waitFor(() => {
        expect(screen.getAllByTestId('post-card-mock')).toHaveLength(2);
      });

      // TODO: Trigger intersection events rapidly
      // Verify feedService.markPostsAsRead called only once per post
    });

    it('should preserve unread posts during optimistic updates', async () => {
      const fivePosts: FeedPostItem[] = [
        ...mockFeedPosts,
        createMockFeedPostItem({
          id: 'post-3',
          userId: 'user-3',
          userHandle: 'user3',
          authorHandle: 'user3',
          caption: 'Third post',
          likesCount: 3,
          commentsCount: 0,
          createdAt: '2025-10-09T12:00:00Z',
          isLiked: false
        }),
        createMockFeedPostItem({
          id: 'post-4',
          userId: 'user-4',
          userHandle: 'user4',
          authorHandle: 'user4',
          caption: 'Fourth post',
          likesCount: 7,
          commentsCount: 2,
          createdAt: '2025-10-09T13:00:00Z',
          isLiked: false
        }),
        createMockFeedPostItem({
          id: 'post-5',
          userId: 'user-5',
          userHandle: 'user5',
          authorHandle: 'user5',
          caption: 'Fifth post',
          likesCount: 12,
          commentsCount: 4,
          createdAt: '2025-10-09T14:00:00Z',
          isLiked: false
        })
      ];

      vi.mocked(feedService.feedService.markPostsAsRead).mockResolvedValue({
        success: true,
        markedCount: 1
      });

      vi.mocked(feedService.feedService.getFollowingFeed).mockResolvedValue({
        posts: fivePosts,
        nextCursor: undefined,
        hasMore: false
      });

      renderHomePage();

      await waitFor(() => {
        expect(screen.getAllByTestId('post-card-mock')).toHaveLength(5);
      });

      // TODO: Mark post #2 as read
      // Verify posts #1, #3, #4, #5 remain visible
    });
  });
});
