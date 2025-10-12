import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NotificationsPage } from './NotificationsPage';
import { notificationService } from '../services/notificationService';
import type { Notification } from '@social-media-app/shared';

// Mock the notification service
vi.mock('../services/notificationService');

// Mock react-router-dom navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

/**
 * Helper function to render components with router context
 */
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

/**
 * Helper function to create mock notifications
 */
const createMockNotification = (
  overrides?: Partial<Notification>
): Notification => {
  const now = new Date();
  return {
    id: 'notif-1',
    userId: 'user-1',
    type: 'like',
    status: 'unread',
    title: 'New like',
    message: 'john liked your post',
    priority: 'normal',
    actor: {
      userId: 'john-id',
      handle: 'john',
      displayName: 'John Doe',
      avatarUrl: 'https://example.com/avatars/john.jpg'
    },
    target: {
      type: 'post',
      id: 'post-1',
      url: '/post/123',
      preview: 'My awesome post'
    },
    deliveryChannels: ['in-app'],
    soundEnabled: true,
    vibrationEnabled: true,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...overrides
  };
};

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('Loading State', () => {
    it('should display loading spinner while fetching notifications', () => {
      // Mock delayed response that never resolves
      vi.mocked(notificationService.getNotifications).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithRouter(<NotificationsPage />);

      expect(screen.getByText(/loading notifications/i)).toBeInTheDocument();
      expect(document.querySelector('.spinner')).toBeInTheDocument();
    });

    it('should show loading container with proper structure', () => {
      vi.mocked(notificationService.getNotifications).mockImplementation(
        () => new Promise(() => {})
      );

      renderWithRouter(<NotificationsPage />);

      const loadingContainer = document.querySelector('.notifications-page__loading');
      expect(loadingContainer).toBeInTheDocument();
      expect(loadingContainer?.querySelector('.spinner')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no notifications exist', async () => {
      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [],
        totalCount: 0,
        unreadCount: 0,
        hasMore: false,
        nextCursor: undefined
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument();
      });
    });

    it('should display empty state icon', async () => {
      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [],
        totalCount: 0,
        unreadCount: 0,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        const emptyContainer = document.querySelector('.notifications-page__empty');
        expect(emptyContainer).toBeInTheDocument();
      });
    });

    it('should display helpful empty state message', async () => {
      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [],
        totalCount: 0,
        unreadCount: 0,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/when someone likes, comments, or follows you/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error state when fetch fails', async () => {
      vi.mocked(notificationService.getNotifications).mockRejectedValue(
        new Error('Failed to fetch')
      );

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load notifications/i)).toBeInTheDocument();
      });
    });

    it('should display retry button on error', async () => {
      vi.mocked(notificationService.getNotifications).mockRejectedValue(
        new Error('Network error')
      );

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /try again/i });
        expect(retryButton).toBeInTheDocument();
      });
    });

    it('should retry loading notifications when retry button clicked', async () => {
      // First call fails, second succeeds
      vi.mocked(notificationService.getNotifications)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          notifications: [createMockNotification()],
          totalCount: 1,
          unreadCount: 1,
          hasMore: false
        });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load notifications/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText(/john doe liked your post/i)).toBeInTheDocument();
      });

      expect(notificationService.getNotifications).toHaveBeenCalledTimes(2);
    });

    it('should handle mark as read errors gracefully', async () => {
      const mockNotification = createMockNotification({ status: 'unread' });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      vi.mocked(notificationService.markAsRead).mockRejectedValue(
        new Error('Failed to mark as read')
      );

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/john doe liked your post/i)).toBeInTheDocument();
      });

      const notificationItem = screen.getByText(/john doe liked your post/i).closest('.notification-item');
      fireEvent.click(notificationItem!);

      // Should still navigate even if mark as read fails
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/post/123');
      });
    });

    it('should display error when mark all as read fails', async () => {
      const mockNotification = createMockNotification({ status: 'unread' });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      vi.mocked(notificationService.markAllAsRead).mockRejectedValue(
        new Error('Failed to mark all as read')
      );

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/mark all as read/i)).toBeInTheDocument();
      });

      const markAllButton = screen.getByText(/mark all as read/i);
      fireEvent.click(markAllButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to mark all as read/i)).toBeInTheDocument();
      });
    });

    it('should display error when delete fails', async () => {
      const mockNotification = createMockNotification();

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      vi.mocked(notificationService.deleteNotification).mockRejectedValue(
        new Error('Failed to delete')
      );

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/john doe liked your post/i)).toBeInTheDocument();
      });

      const deleteButton = screen.getByLabelText(/delete notification/i);
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to delete notification/i)).toBeInTheDocument();
      });
    });
  });

  describe('Notification List Rendering', () => {
    it('should render notification items correctly', async () => {
      const mockNotifications = [createMockNotification()];

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: mockNotifications,
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/john doe liked your post/i)).toBeInTheDocument();
      });
    });

    it('should render multiple notifications', async () => {
      const mockNotifications = [
        createMockNotification({
          id: 'notif-1',
          actor: { userId: 'john-id', handle: 'john', displayName: 'John Doe' }
        }),
        createMockNotification({
          id: 'notif-2',
          type: 'comment',
          actor: { userId: 'jane-id', handle: 'jane', displayName: 'Jane Smith' }
        })
      ];

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: mockNotifications,
        totalCount: 2,
        unreadCount: 2,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/john doe liked your post/i)).toBeInTheDocument();
        expect(screen.getByText(/jane smith commented on your post/i)).toBeInTheDocument();
      });
    });

    it('should display notification timestamp', async () => {
      const now = new Date();
      const mockNotification = createMockNotification({
        createdAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString() // 5 minutes ago
      });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/5m/)).toBeInTheDocument();
      });
    });

    it('should display avatar for notifications with actor', async () => {
      const mockNotification = createMockNotification();

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        const avatar = screen.getByAltText('John Doe');
        expect(avatar).toBeInTheDocument();
        expect(avatar).toHaveAttribute('src', 'https://example.com/avatars/john.jpg');
      });
    });

    it('should display icon for notifications without avatar', async () => {
      const mockNotification = createMockNotification({
        actor: {
          userId: 'john-id',
          handle: 'john',
          displayName: 'John Doe'
          // No avatarUrl
        }
      });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        const iconContainer = document.querySelector('.notification-item__icon');
        expect(iconContainer).toBeInTheDocument();
      });
    });

    it('should display unread indicator for unread notifications', async () => {
      const mockNotification = createMockNotification({ status: 'unread' });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        const unreadDot = document.querySelector('.notification-item__unread-dot');
        expect(unreadDot).toBeInTheDocument();
      });
    });

    it('should not display unread indicator for read notifications', async () => {
      const mockNotification = createMockNotification({ status: 'read' });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 0,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/john doe liked your post/i)).toBeInTheDocument();
      });

      const unreadDot = document.querySelector('.notification-item__unread-dot');
      expect(unreadDot).not.toBeInTheDocument();
    });

    it('should display target preview when available', async () => {
      const mockNotification = createMockNotification({
        target: {
          type: 'post',
          id: 'post-1',
          url: '/post/123',
          preview: 'Check out my awesome sunset photo!'
        }
      });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/check out my awesome sunset photo!/i)).toBeInTheDocument();
      });
    });

    it('should display thumbnail when available', async () => {
      const mockNotification = createMockNotification({
        target: {
          type: 'post',
          id: 'post-1',
          url: '/post/123'
        },
        metadata: {
          thumbnailUrl: 'https://example.com/thumbs/post-1.jpg'
        }
      });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        const thumbnail = screen.getByAltText('Post thumbnail');
        expect(thumbnail).toBeInTheDocument();
        expect(thumbnail).toHaveAttribute('src', 'https://example.com/thumbs/post-1.jpg');
      });
    });
  });

  describe('Time Grouping', () => {
    it('should group notifications by "Today"', async () => {
      const now = new Date();
      const mockNotification = createMockNotification({
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
      });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText('Today')).toBeInTheDocument();
      });
    });

    it('should group notifications by "Yesterday"', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const mockNotification = createMockNotification({
        createdAt: yesterday.toISOString()
      });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText('Yesterday')).toBeInTheDocument();
      });
    });

    it('should group notifications by "This week"', async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const mockNotification = createMockNotification({
        createdAt: threeDaysAgo.toISOString()
      });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText('This week')).toBeInTheDocument();
      });
    });

    it('should group notifications by "This month"', async () => {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const mockNotification = createMockNotification({
        createdAt: twoWeeksAgo.toISOString()
      });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText('This month')).toBeInTheDocument();
      });
    });

    it('should group notifications by "Earlier"', async () => {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      const mockNotification = createMockNotification({
        createdAt: twoMonthsAgo.toISOString()
      });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText('Earlier')).toBeInTheDocument();
      });
    });

    it('should display multiple groups correctly', async () => {
      const now = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockNotifications = [
        createMockNotification({
          id: 'notif-today',
          createdAt: now.toISOString(),
          message: 'today notification'
        }),
        createMockNotification({
          id: 'notif-yesterday',
          createdAt: yesterday.toISOString(),
          message: 'yesterday notification'
        })
      ];

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: mockNotifications,
        totalCount: 2,
        unreadCount: 2,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText('Today')).toBeInTheDocument();
        expect(screen.getByText('Yesterday')).toBeInTheDocument();
      });
    });
  });

  describe('Mark as Read', () => {
    it('should mark notification as read when clicked', async () => {
      const mockNotification = createMockNotification({ status: 'unread' });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      vi.mocked(notificationService.markAsRead).mockResolvedValue({
        notification: { ...mockNotification, status: 'read' }
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/john doe liked your post/i)).toBeInTheDocument();
      });

      const notificationItem = screen.getByText(/john doe liked your post/i).closest('.notification-item');
      fireEvent.click(notificationItem!);

      await waitFor(() => {
        expect(notificationService.markAsRead).toHaveBeenCalledWith('notif-1');
      });
    });

    it('should update UI after marking as read', async () => {
      const mockNotification = createMockNotification({ status: 'unread' });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      vi.mocked(notificationService.markAsRead).mockResolvedValue({
        notification: { ...mockNotification, status: 'read' }
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(document.querySelector('.notification-item__unread-dot')).toBeInTheDocument();
      });

      const notificationItem = screen.getByText(/john doe liked your post/i).closest('.notification-item');
      fireEvent.click(notificationItem!);

      await waitFor(() => {
        expect(document.querySelector('.notification-item__unread-dot')).not.toBeInTheDocument();
      });
    });

    it('should not mark already-read notification as read', async () => {
      const mockNotification = createMockNotification({ status: 'read' });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 0,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/john doe liked your post/i)).toBeInTheDocument();
      });

      const notificationItem = screen.getByText(/john doe liked your post/i).closest('.notification-item');
      fireEvent.click(notificationItem!);

      expect(notificationService.markAsRead).not.toHaveBeenCalled();
    });
  });

  describe('Mark All as Read', () => {
    it('should display mark all as read button when unread notifications exist', async () => {
      const mockNotification = createMockNotification({ status: 'unread' });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/mark all as read/i)).toBeInTheDocument();
      });
    });

    it('should not display mark all as read button when all notifications are read', async () => {
      const mockNotification = createMockNotification({ status: 'read' });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 0,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/john doe liked your post/i)).toBeInTheDocument();
      });

      expect(screen.queryByText(/mark all as read/i)).not.toBeInTheDocument();
    });

    it('should mark all notifications as read when button clicked', async () => {
      const mockNotifications = [
        createMockNotification({ id: 'notif-1', status: 'unread' }),
        createMockNotification({ id: 'notif-2', status: 'unread' })
      ];

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: mockNotifications,
        totalCount: 2,
        unreadCount: 2,
        hasMore: false
      });

      vi.mocked(notificationService.markAllAsRead).mockResolvedValue({
        updatedCount: 2
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/mark all as read/i)).toBeInTheDocument();
      });

      const markAllButton = screen.getByText(/mark all as read/i);
      fireEvent.click(markAllButton);

      await waitFor(() => {
        expect(notificationService.markAllAsRead).toHaveBeenCalled();
      });
    });

    it('should update UI after marking all as read', async () => {
      const mockNotifications = [
        createMockNotification({ id: 'notif-1', status: 'unread' }),
        createMockNotification({ id: 'notif-2', status: 'unread' })
      ];

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: mockNotifications,
        totalCount: 2,
        unreadCount: 2,
        hasMore: false
      });

      vi.mocked(notificationService.markAllAsRead).mockResolvedValue({
        updatedCount: 2
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/mark all as read/i)).toBeInTheDocument();
      });

      const markAllButton = screen.getByText(/mark all as read/i);
      fireEvent.click(markAllButton);

      await waitFor(() => {
        expect(screen.queryByText(/mark all as read/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Delete Notification', () => {
    it('should delete notification when delete button clicked', async () => {
      const mockNotification = createMockNotification();

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      vi.mocked(notificationService.deleteNotification).mockResolvedValue({
        success: true
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/john doe liked your post/i)).toBeInTheDocument();
      });

      const deleteButton = screen.getByLabelText(/delete notification/i);
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(notificationService.deleteNotification).toHaveBeenCalledWith('notif-1');
      });
    });

    it('should remove notification from list after deletion', async () => {
      const mockNotification = createMockNotification();

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      vi.mocked(notificationService.deleteNotification).mockResolvedValue({
        success: true
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/john doe liked your post/i)).toBeInTheDocument();
      });

      const deleteButton = screen.getByLabelText(/delete notification/i);
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByText(/john doe liked your post/i)).not.toBeInTheDocument();
      });
    });

    it('should prevent event bubbling when delete button clicked', async () => {
      const mockNotification = createMockNotification({ status: 'unread' });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      vi.mocked(notificationService.deleteNotification).mockResolvedValue({
        success: true
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/john doe liked your post/i)).toBeInTheDocument();
      });

      const deleteButton = screen.getByLabelText(/delete notification/i);
      fireEvent.click(deleteButton);

      // Should not navigate (mark as read should not be called since delete prevents bubbling)
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(notificationService.markAsRead).not.toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    it('should navigate to notification target on click', async () => {
      const mockNotification = createMockNotification({
        status: 'read', // Already read, so won't call markAsRead
        target: {
          type: 'post',
          id: 'post-1',
          url: '/post/123'
        }
      });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 0,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/john doe liked your post/i)).toBeInTheDocument();
      });

      const notificationItem = screen.getByText(/john doe liked your post/i).closest('.notification-item');
      fireEvent.click(notificationItem!);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/post/123');
      });
    });

    it('should not navigate when notification has no target URL', async () => {
      const mockNotification = createMockNotification({
        status: 'read',
        target: {
          type: 'post',
          id: 'post-1'
          // No URL
        }
      });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 0,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/john doe liked your post/i)).toBeInTheDocument();
      });

      const notificationItem = screen.getByText(/john doe liked your post/i).closest('.notification-item');
      fireEvent.click(notificationItem!);

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Time Formatting', () => {
    it('should format time as "just now" for very recent notifications', async () => {
      const now = new Date();
      const mockNotification = createMockNotification({
        createdAt: now.toISOString()
      });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText('just now')).toBeInTheDocument();
      });
    });

    it('should format time in minutes for recent notifications', async () => {
      const now = new Date();
      const mockNotification = createMockNotification({
        createdAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString() // 15 minutes ago
      });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/15m/)).toBeInTheDocument();
      });
    });

    it('should format time in hours for notifications from today', async () => {
      const now = new Date();
      const mockNotification = createMockNotification({
        createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString() // 3 hours ago
      });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/3h/)).toBeInTheDocument();
      });
    });

    it('should format time in days for older notifications', async () => {
      const now = new Date();
      const mockNotification = createMockNotification({
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
      });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/5d/)).toBeInTheDocument();
      });
    });

    it('should format time in weeks for very old notifications', async () => {
      const now = new Date();
      const mockNotification = createMockNotification({
        createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString() // 2 weeks ago
      });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/2w/)).toBeInTheDocument();
      });
    });
  });

  describe('Notification Text Formatting', () => {
    it('should format like notifications correctly', async () => {
      const mockNotification = createMockNotification({
        type: 'like',
        actor: { userId: 'john-id', handle: 'john', displayName: 'John Doe' },
        target: { type: 'post', id: 'post-1' }
      });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/john doe liked your post/i)).toBeInTheDocument();
      });
    });

    it('should format comment notifications correctly', async () => {
      const mockNotification = createMockNotification({
        type: 'comment',
        actor: { userId: 'jane-id', handle: 'jane', displayName: 'Jane Smith' }
      });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/jane smith commented on your post/i)).toBeInTheDocument();
      });
    });

    it('should format follow notifications correctly', async () => {
      const mockNotification = createMockNotification({
        type: 'follow',
        actor: { userId: 'bob-id', handle: 'bob', displayName: 'Bob Johnson' }
      });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/bob johnson started following you/i)).toBeInTheDocument();
      });
    });

    it('should format mention notifications correctly', async () => {
      const mockNotification = createMockNotification({
        type: 'mention',
        actor: { userId: 'alice-id', handle: 'alice', displayName: 'Alice Williams' }
      });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/alice williams mentioned you/i)).toBeInTheDocument();
      });
    });

    it('should use handle when display name is missing', async () => {
      const mockNotification = createMockNotification({
        type: 'like',
        actor: {
          userId: 'john-id',
          handle: 'johndoe'
          // No displayName
        }
      });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/johndoe liked your post/i)).toBeInTheDocument();
      });
    });

    it('should use "Someone" when actor is missing', async () => {
      const mockNotification = createMockNotification({
        type: 'like',
        actor: undefined
      });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/someone liked your post/i)).toBeInTheDocument();
      });
    });
  });

  describe('Integration Tests', () => {
    it('should fetch notifications with correct limit on mount', async () => {
      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [],
        totalCount: 0,
        unreadCount: 0,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(notificationService.getNotifications).toHaveBeenCalledWith(100);
      });
    });

    it('should display header correctly', async () => {
      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [],
        totalCount: 0,
        unreadCount: 0,
        hasMore: false
      });

      renderWithRouter(<NotificationsPage />);

      await waitFor(() => {
        expect(screen.getByText('Notifications')).toBeInTheDocument();
      });
    });

    it('should handle complete notification workflow', async () => {
      // Initial load with unread notification
      const mockNotification = createMockNotification({ status: 'unread' });

      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        notifications: [mockNotification],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false
      });

      vi.mocked(notificationService.markAsRead).mockResolvedValue({
        notification: { ...mockNotification, status: 'read' }
      });

      renderWithRouter(<NotificationsPage />);

      // Should show unread indicator
      await waitFor(() => {
        expect(document.querySelector('.notification-item__unread-dot')).toBeInTheDocument();
      });

      // Click notification
      const notificationItem = screen.getByText(/john doe liked your post/i).closest('.notification-item');
      fireEvent.click(notificationItem!);

      // Should mark as read and navigate
      await waitFor(() => {
        expect(notificationService.markAsRead).toHaveBeenCalledWith('notif-1');
        expect(mockNavigate).toHaveBeenCalledWith('/post/123');
      });

      // Unread indicator should be gone
      expect(document.querySelector('.notification-item__unread-dot')).not.toBeInTheDocument();
    });
  });
});
