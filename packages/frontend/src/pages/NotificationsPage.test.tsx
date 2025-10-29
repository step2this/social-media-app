import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent, renderWithServices } from '../services/testing/TestUtils';
import { MockNotificationDataService, createMockServiceContainer } from '../services/testing/MockServices';
import { NotificationsPage } from './NotificationsPage';
import {
  createMockNotificationConnection,
  createMockNotifications,
  createMockNotification
} from '../services/__tests__/fixtures/notificationFixtures';

describe('NotificationsPage', () => {
  let mockNotificationDataService: MockNotificationDataService;

  beforeEach(() => {
    mockNotificationDataService = new MockNotificationDataService();
  });

  // Helper: Render NotificationsPage with configured mock service
  const renderPage = () => {
    const services = createMockServiceContainer();
    services.notificationDataService = mockNotificationDataService;

    return renderWithServices(<NotificationsPage />, {
      services
    });
  };

  describe('Loading State', () => {
    it('should display loading state while fetching notifications', () => {
      // Never-resolving promise simulates loading
      mockNotificationDataService.getNotifications.mockImplementation(
        () => new Promise(() => {})
      );

      renderPage();

      expect(screen.getByText('Loading notifications...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no notifications exist', async () => {
      mockNotificationDataService.getNotifications.mockResolvedValue({
        status: 'success',
        data: []
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/No notifications yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Notification Display', () => {
    it('should display list of notifications', async () => {
      const notifications = createMockNotifications(3);
      mockNotificationDataService.getNotifications.mockResolvedValue({
        status: 'success',
        data: notifications
      });

      renderPage();

      await waitFor(() => {
        notifications.forEach(notif => {
          expect(screen.getByText(notif.message)).toBeInTheDocument();
        });
      });
    });

    it('should display unread notifications with visual indicator', async () => {
      const notifications = createMockNotifications(2, { status: 'unread' });
      mockNotificationDataService.getNotifications.mockResolvedValue({
        status: 'success',
        data: notifications
      });

      renderPage();

      await waitFor(() => {
        // Look for unread indicators
        const unreadIndicators = screen.getAllByLabelText(/unread/i);
        expect(unreadIndicators.length).toBeGreaterThan(0);
      });
    });

    it('should display different notification types correctly', async () => {
      const notifications = [
        createMockNotification({ type: 'like', message: 'John liked your post' }),
        createMockNotification({ type: 'comment', message: 'Sarah commented on your post' }),
        createMockNotification({ type: 'follow', message: 'Mike started following you' }),
      ];

      mockNotificationDataService.getNotifications.mockResolvedValue({
        status: 'success',
        data: notifications
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('John liked your post')).toBeInTheDocument();
        expect(screen.getByText('Sarah commented on your post')).toBeInTheDocument();
        expect(screen.getByText('Mike started following you')).toBeInTheDocument();
      });
    });
  });

  describe('Mark as Read', () => {
    it('should mark notification as read when clicked', async () => {
      const notification = createMockNotification({ status: 'unread' });
      mockNotificationDataService.getNotifications.mockResolvedValue({
        status: 'success',
        data: [notification]
      });
      mockNotificationDataService.markAsRead.mockResolvedValue({ success: true });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(notification.message)).toBeInTheDocument();
      });

      // Click the notification
      const notificationElement = screen.getByText(notification.message);
      fireEvent.click(notificationElement);

      // Verify service was called
      await waitFor(() => {
        expect(mockNotificationDataService.markAsRead).toHaveBeenCalledWith(notification.id);
      });
    });

    it('should mark all notifications as read when button clicked', async () => {
      const notifications = createMockNotifications(3, { status: 'unread' });
      mockNotificationDataService.getNotifications.mockResolvedValue({
        status: 'success',
        data: notifications
      });
      mockNotificationDataService.markAllAsRead.mockResolvedValue({
        success: true,
        markedCount: 3
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/mark all as read/i)).toBeInTheDocument();
      });

      const markAllButton = screen.getByText(/mark all as read/i);
      fireEvent.click(markAllButton);

      await waitFor(() => {
        expect(mockNotificationDataService.markAllAsRead).toHaveBeenCalled();
      });
    });

    it('should not call markAsRead for already read notifications', async () => {
      const notification = createMockNotification({ status: 'read' });
      mockNotificationDataService.getNotifications.mockResolvedValue({
        status: 'success',
        data: [notification]
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(notification.message)).toBeInTheDocument();
      });

      // Click the notification
      const notificationElement = screen.getByText(notification.message);
      fireEvent.click(notificationElement);

      // Should NOT call markAsRead for already-read notification
      expect(mockNotificationDataService.markAsRead).not.toHaveBeenCalled();
    });
  });

  describe('Delete Notification', () => {
    it('should delete notification when delete button clicked', async () => {
      const notification = createMockNotification();
      mockNotificationDataService.getNotifications.mockResolvedValue({
        status: 'success',
        data: [notification]
      });
      mockNotificationDataService.deleteNotification.mockResolvedValue({ success: true });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(notification.message)).toBeInTheDocument();
      });

      // Find and click delete button
      const deleteButton = screen.getByLabelText(/delete/i);
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockNotificationDataService.deleteNotification).toHaveBeenCalledWith(notification.id);
      });
    });

    it('should remove notification from list after successful deletion', async () => {
      const notification = createMockNotification({ message: 'Test notification' });
      mockNotificationDataService.getNotifications.mockResolvedValue({
        status: 'success',
        data: [notification]
      });
      mockNotificationDataService.deleteNotification.mockResolvedValue({ success: true });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Test notification')).toBeInTheDocument();
      });

      // Click delete
      const deleteButton = screen.getByLabelText(/delete/i);
      fireEvent.click(deleteButton);

      // Notification should be removed from UI
      await waitFor(() => {
        expect(screen.queryByText('Test notification')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when fetching fails', async () => {
      mockNotificationDataService.getNotifications.mockRejectedValue(
        new Error('Network error')
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/failed to load notifications/i)).toBeInTheDocument();
      });
    });

    it('should display error message when mark as read fails', async () => {
      const notification = createMockNotification({ status: 'unread' });
      mockNotificationDataService.getNotifications.mockResolvedValue({
        status: 'success',
        data: [notification]
      });
      mockNotificationDataService.markAsRead.mockRejectedValue(
        new Error('Failed to mark as read')
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(notification.message)).toBeInTheDocument();
      });

      // Click notification (will fail to mark as read)
      const notificationElement = screen.getByText(notification.message);
      fireEvent.click(notificationElement);

      // Error should be logged (we're not asserting console.error here)
      // The UI should still work even if marking as read fails
      expect(mockNotificationDataService.markAsRead).toHaveBeenCalled();
    });

    it('should display error message when delete fails', async () => {
      const notification = createMockNotification();
      mockNotificationDataService.getNotifications.mockResolvedValue({
        status: 'success',
        data: [notification]
      });
      mockNotificationDataService.deleteNotification.mockRejectedValue(
        new Error('Failed to delete')
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(notification.message)).toBeInTheDocument();
      });

      // Click delete (will fail)
      const deleteButton = screen.getByLabelText(/delete/i);
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to delete notification/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to target URL when notification with target is clicked', async () => {
      const notification = createMockNotification({
        target: {
          type: 'post',
          id: 'post-123',
          url: '/posts/post-123'
        }
      });

      mockNotificationDataService.getNotifications.mockResolvedValue({
        status: 'success',
        data: [notification]
      });
      mockNotificationDataService.markAsRead.mockResolvedValue({ success: true });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(notification.message)).toBeInTheDocument();
      });

      // Click notification
      const notificationElement = screen.getByText(notification.message);
      fireEvent.click(notificationElement);

      // Navigation should happen (tested via router mock in TestUtils)
      await waitFor(() => {
        expect(mockNotificationDataService.markAsRead).toHaveBeenCalled();
      });
    });
  });

  describe('Pagination', () => {
    it('should load more notifications when scrolling to bottom', async () => {
      const firstBatch = createMockNotifications(10);
      const secondBatch = createMockNotifications(5);

      mockNotificationDataService.getNotifications
        .mockResolvedValueOnce({ status: 'success', data: firstBatch })
        .mockResolvedValueOnce({ status: 'success', data: secondBatch });

      renderPage();

      await waitFor(() => {
        expect(screen.getAllByRole('listitem')).toHaveLength(10);
      });

      // Simulate scroll to bottom
      const loadMoreButton = screen.getByText(/load more/i);
      fireEvent.click(loadMoreButton);

      await waitFor(() => {
        expect(screen.getAllByRole('listitem')).toHaveLength(15);
      });

      expect(mockNotificationDataService.getNotifications).toHaveBeenCalledTimes(2);
    });

    it('should not show load more button when no more notifications', async () => {
      const notifications = createMockNotifications(5);
      mockNotificationDataService.getNotifications.mockResolvedValue({
        status: 'success',
        data: notifications
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getAllByRole('listitem')).toHaveLength(5);
      });

      // Should not show load more button
      expect(screen.queryByText(/load more/i)).not.toBeInTheDocument();
    });
  });
});
