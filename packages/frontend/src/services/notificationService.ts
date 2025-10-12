import { apiClient } from './apiClient';
import type {
  NotificationsListResponse,
  GetUnreadCountResponse,
  MarkNotificationReadResponse,
  MarkAllNotificationsReadResponse,
  DeleteNotificationResponse
} from '@social-media-app/shared';

/**
 * Notification service for frontend API calls
 */
export const notificationService = {
  /**
   * Get paginated list of notifications
   * @param limit - Maximum number of notifications to fetch (default: 20)
   * @param cursor - Pagination cursor for next page
   * @param filter - Optional filter ('unread' to get only unread notifications)
   * @returns Promise<NotificationsListResponse> - Paginated notifications list
   */
  async getNotifications(
    limit: number = 20,
    cursor?: string,
    filter?: 'unread'
  ): Promise<NotificationsListResponse> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (cursor) params.append('cursor', cursor);
    if (filter) params.append('filter', filter);

    const queryString = params.toString();
    const url = `/notifications${queryString ? `?${queryString}` : ''}`;

    return apiClient.get<NotificationsListResponse>(url);
  },

  /**
   * Get count of unread notifications
   * @returns Promise<GetUnreadCountResponse> - Unread notification count
   */
  async getUnreadCount(): Promise<GetUnreadCountResponse> {
    return apiClient.get<GetUnreadCountResponse>('/notifications/unread-count');
  },

  /**
   * Mark a notification as read
   * @param notificationId - ID of notification to mark as read
   * @returns Promise<MarkNotificationReadResponse> - Response with updated notification
   * @throws Error if notificationId is empty or invalid
   */
  async markAsRead(notificationId: string): Promise<MarkNotificationReadResponse> {
    if (!notificationId || notificationId.trim() === '') {
      throw new Error('notificationId is required and cannot be empty');
    }

    return apiClient.put<MarkNotificationReadResponse>(
      `/notifications/${notificationId}/read`
    );
  },

  /**
   * Mark all notifications as read
   * @returns Promise<MarkAllNotificationsReadResponse> - Response with count of updated notifications
   */
  async markAllAsRead(): Promise<MarkAllNotificationsReadResponse> {
    return apiClient.put<MarkAllNotificationsReadResponse>('/notifications/mark-all-read');
  },

  /**
   * Delete a notification
   * @param notificationId - ID of notification to delete
   * @returns Promise<DeleteNotificationResponse> - Response confirming deletion
   * @throws Error if notificationId is empty or invalid
   */
  async deleteNotification(notificationId: string): Promise<DeleteNotificationResponse> {
    if (!notificationId || notificationId.trim() === '') {
      throw new Error('notificationId is required and cannot be empty');
    }

    return apiClient.delete<DeleteNotificationResponse>(`/notifications/${notificationId}`);
  }
};
