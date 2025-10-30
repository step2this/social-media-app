import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { HomePage } from './HomePage';
import type { IServiceContainer } from '../services/interfaces/IServiceContainer';
import type { IFeedService } from '../services/interfaces/IFeedService';
import type { PostWithAuthor } from '@social-media-app/shared';
import { createMockFeedPostItem } from '../test-utils/mock-factories';
import { renderWithProviders } from '../test-utils/test-providers';
import { createMockServiceContainer, createMockFeedService } from '../test-utils/mock-service-container';

// Mock useFeedItemAutoRead hook
vi.mock('../hooks/useFeedItemAutoRead', () => ({
  useFeedItemAutoRead: vi.fn(() => ({ current: null }))
}));

// Mock PostCard component to verify it's being used instead of FeedPostCard
vi.mock('../components/posts/PostCard', () => ({
  PostCard: ({ post }: { post: PostWithAuthor }) => (
    <div data-testid="post-card-mock">
      <div data-testid="post-card-id">{post.id}</div>
      <div data-testid="post-card-handle">{post.authorHandle}</div>
    </div>
  )
}));

const mockFeedPosts: PostWithAuthor[] = [
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

describe('HomePage', () => {
  let mockFeedService: IFeedService;
  let mockServiceContainer: IServiceContainer;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mocks for each test using DI pattern
    mockFeedService = createMockFeedService();
    mockServiceContainer = createMockServiceContainer({
      feedService: mockFeedService
    });
  });

  const renderHomePage = () =>
    renderWithProviders(<HomePage />, { serviceContainer: mockServiceContainer });

  describe('PostCard Integration (TDD Refactor)', () => {
    it('should use PostCard component instead of FeedPostCard', async () => {
      // Arrange: Mock successful feed response with AsyncState
      vi.mocked(mockFeedService.getFollowingFeed).mockResolvedValue({
        status: 'success',
        data: {
          items: mockFeedPosts,
          hasNextPage: false,
          endCursor: null
        }
      });

      // Act: Render with mocked services via DI
      renderHomePage();

      // Assert: Verify PostCard components rendered
      await waitFor(() => {
        expect(screen.getAllByTestId('post-card-mock')).toHaveLength(2);
      });

      // Verify PostCard is rendering with correct data
      const postIds = screen.getAllByTestId('post-card-id');
      expect(postIds[0]).toHaveTextContent('post-1');
      expect(screen.getByText('user1')).toBeInTheDocument();

      // Verify feedService was called
      expect(mockFeedService.getFollowingFeed).toHaveBeenCalledOnce();
    });

    it('should NOT use FeedPostCard component', async () => {
      // Arrange: Mock successful feed response
      vi.mocked(mockFeedService.getFollowingFeed).mockResolvedValue({
        status: 'success',
        data: {
          items: mockFeedPosts,
          hasNextPage: false,
          endCursor: null
        }
      });

      // Act
      renderHomePage();

      // Assert: Verify posts rendered
      await waitFor(() => {
        expect(screen.getAllByTestId('post-card-mock')).toHaveLength(2);
      });

      // FeedPostCard uses .feed-post-card class, PostCard uses .post-card
      const container = document.querySelector('.home-page__container');
      expect(container?.querySelector('.feed-post-card')).not.toBeInTheDocument();
    });

    it('should pass all feed posts to PostCard components', async () => {
      // Arrange: Mock successful feed response
      vi.mocked(mockFeedService.getFollowingFeed).mockResolvedValue({
        status: 'success',
        data: {
          items: mockFeedPosts,
          hasNextPage: false,
          endCursor: null
        }
      });

      // Act
      renderHomePage();

      // Assert: Verify all posts rendered
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
      // Arrange: Mock the hook to track calls
      const mockAutoReadHook = vi.fn(() => ({ current: null }));
      const { useFeedItemAutoRead } = await import('../hooks/useFeedItemAutoRead');
      vi.mocked(useFeedItemAutoRead).mockImplementation(mockAutoReadHook);

      vi.mocked(mockFeedService.getFollowingFeed).mockResolvedValue({
        status: 'success',
        data: {
          items: mockFeedPosts,
          hasNextPage: false,
          endCursor: null
        }
      });

      // Act
      renderHomePage();

      // Assert: Verify posts rendered
      await waitFor(() => {
        expect(screen.getAllByTestId('post-card-mock')).toHaveLength(2);
      });

      // Verify useFeedItemAutoRead hook called for each post
      expect(mockAutoReadHook).toHaveBeenCalledWith('post-1');
      expect(mockAutoReadHook).toHaveBeenCalledWith('post-2');
    });

    it('should use useOptimistic for instant post removal on read', async () => {
      // Arrange: Mock markPostsAsRead to delay (simulate API call)
      vi.mocked(mockFeedService.markPostsAsRead).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  status: 'success',
                  data: { success: true, markedCount: 1 }
                }),
              1000
            )
          )
      );

      vi.mocked(mockFeedService.getFollowingFeed).mockResolvedValue({
        status: 'success',
        data: {
          items: mockFeedPosts,
          hasNextPage: false,
          endCursor: null
        }
      });

      // Act
      renderHomePage();

      // Assert: Verify both posts initially visible
      await waitFor(() => {
        expect(screen.getAllByTestId('post-card-mock')).toHaveLength(2);
      });

      expect(screen.getByText('post-1')).toBeInTheDocument();
      expect(screen.getByText('post-2')).toBeInTheDocument();

      // TODO: Trigger auto-read on first post
      // Post should be immediately removed from UI (optimistic)
      // API call should be made in background
    });

    it('should roll back optimistic update on API failure', async () => {
      // Arrange: Mock markPostsAsRead to throw error
      vi.mocked(mockFeedService.markPostsAsRead).mockResolvedValue({
        status: 'error',
        error: { message: 'Network error' }
      });

      vi.mocked(mockFeedService.getFollowingFeed).mockResolvedValue({
        status: 'success',
        data: {
          items: mockFeedPosts,
          hasNextPage: false,
          endCursor: null
        }
      });

      // Act
      renderHomePage();

      // Assert: Verify posts rendered
      await waitFor(() => {
        expect(screen.getAllByTestId('post-card-mock')).toHaveLength(2);
      });

      // TODO: Trigger auto-read
      // Verify post removed optimistically
      // Verify post reappears after error
    });

    it('should handle rapid scroll without duplicate API calls', async () => {
      // Arrange
      vi.mocked(mockFeedService.markPostsAsRead).mockResolvedValue({
        status: 'success',
        data: { success: true, markedCount: 1 }
      });

      vi.mocked(mockFeedService.getFollowingFeed).mockResolvedValue({
        status: 'success',
        data: {
          items: mockFeedPosts,
          hasNextPage: false,
          endCursor: null
        }
      });

      // Act
      renderHomePage();

      // Assert: Verify posts rendered
      await waitFor(() => {
        expect(screen.getAllByTestId('post-card-mock')).toHaveLength(2);
      });

      // TODO: Trigger intersection events rapidly
      // Verify feedService.markPostsAsRead called only once per post
    });

    it('should preserve unread posts during optimistic updates', async () => {
      // Arrange: Create 5 posts
      const fivePosts: PostWithAuthor[] = [
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

      vi.mocked(mockFeedService.markPostsAsRead).mockResolvedValue({
        status: 'success',
        data: { success: true, markedCount: 1 }
      });

      vi.mocked(mockFeedService.getFollowingFeed).mockResolvedValue({
        status: 'success',
        data: {
          items: fivePosts,
          hasNextPage: false,
          endCursor: null
        }
      });

      // Act
      renderHomePage();

      // Assert: Verify all 5 posts rendered
      await waitFor(() => {
        expect(screen.getAllByTestId('post-card-mock')).toHaveLength(5);
      });

      // TODO: Mark post #2 as read
      // Verify posts #1, #3, #4, #5 remain visible
    });
  });
});
