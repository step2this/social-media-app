/**
 * Notification Service Barrel Export
 * Re-exports the notification service implementation for easy imports
 */

import { NotificationService } from './implementations/NotificationService.js';

// Create singleton instance
export const notificationService = new NotificationService();
