import type { INavigationService } from './INavigationService';
import type { IAuthService } from './IAuthService';
import type { IModalService } from './IModalService';
import type { INotificationService } from './INotificationService';

/**
 * Service container interface - provides access to all application services
 * This is the main dependency injection container that components can use
 */
export interface IServiceContainer {
  /**
   * Navigation service for routing operations
   */
  readonly navigationService: INavigationService;

  /**
   * Authentication service for user management
   */
  readonly authService: IAuthService;

  /**
   * Modal service for UI modal state management
   */
  readonly modalService: IModalService;

  /**
   * Notification service for user feedback
   */
  readonly notificationService: INotificationService;
}

/**
 * Re-export all service interfaces for convenience
 */
export type {
  INavigationService,
  IAuthService,
  IModalService,
  INotificationService
};