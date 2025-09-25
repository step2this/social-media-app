import type { INotificationService } from '../interfaces/INotificationService';

/**
 * Notification data structure
 */
interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  timestamp: number;
  duration?: number;
}

/**
 * Concrete implementation of notification service
 * This provides a centralized way to manage user notifications
 */
export class NotificationService implements INotificationService {
  private notifications: Map<string, Notification> = new Map();
  private notificationCallbacks: Set<(notifications: Notification[]) => void> = new Set();
  private idCounter: number = 0;

  showSuccess(message: string, duration: number = 5000): void {
    this.addNotification('success', message, duration);
  }

  showError(message: string, duration: number = 7000): void {
    this.addNotification('error', message, duration);
  }

  showInfo(message: string, duration: number = 4000): void {
    this.addNotification('info', message, duration);
  }

  showWarning(message: string, duration: number = 6000): void {
    this.addNotification('warning', message, duration);
  }

  clearAll(): void {
    this.notifications.clear();
    this.notifyChange();
  }

  clearNotification(notificationId: string): void {
    this.notifications.delete(notificationId);
    this.notifyChange();
  }

  /**
   * Subscribe to notification changes (for UI components)
   * @param callback - Function called when notifications change
   * @returns Unsubscribe function
   */
  onNotificationChange(callback: (notifications: Notification[]) => void): () => void {
    this.notificationCallbacks.add(callback);

    // Call immediately with current notifications
    callback(Array.from(this.notifications.values()));

    // Return unsubscribe function
    return () => {
      this.notificationCallbacks.delete(callback);
    };
  }

  /**
   * Get current notifications (for testing or direct access)
   */
  getCurrentNotifications(): Notification[] {
    return Array.from(this.notifications.values());
  }

  private addNotification(
    type: 'success' | 'error' | 'info' | 'warning',
    message: string,
    duration?: number
  ): void {
    const id = `notification-${++this.idCounter}`;
    const notification: Notification = {
      id,
      type,
      message,
      timestamp: Date.now(),
      duration
    };

    this.notifications.set(id, notification);
    this.notifyChange();

    // Auto-remove after duration
    if (duration && duration > 0) {
      setTimeout(() => {
        this.clearNotification(id);
      }, duration);
    }
  }

  private notifyChange(): void {
    const currentNotifications = Array.from(this.notifications.values());
    this.notificationCallbacks.forEach(callback => {
      callback(currentNotifications);
    });
  }
}

/**
 * Factory function for creating NotificationService instances
 * Useful for dependency injection and testing
 */
export const createNotificationService = (): INotificationService => {
  return new NotificationService();
};