/**
 * Notification service interface - abstracts user feedback mechanisms
 * This allows components to show notifications without knowing the implementation
 */
export interface INotificationService {
  /**
   * Show a success notification to the user
   * @param message - The success message to display
   * @param duration - How long to show the notification (ms), optional
   */
  showSuccess(message: string, duration?: number): void;

  /**
   * Show an error notification to the user
   * @param message - The error message to display
   * @param duration - How long to show the notification (ms), optional
   */
  showError(message: string, duration?: number): void;

  /**
   * Show an info notification to the user
   * @param message - The info message to display
   * @param duration - How long to show the notification (ms), optional
   */
  showInfo(message: string, duration?: number): void;

  /**
   * Show a warning notification to the user
   * @param message - The warning message to display
   * @param duration - How long to show the notification (ms), optional
   */
  showWarning(message: string, duration?: number): void;

  /**
   * Clear all notifications
   */
  clearAll(): void;

  /**
   * Clear a specific notification by ID
   * @param notificationId - The ID of the notification to clear
   */
  clearNotification(notificationId: string): void;
}