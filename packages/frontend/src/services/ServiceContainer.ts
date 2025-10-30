import type { IServiceContainer } from './interfaces/IServiceContainer';
import { NavigationService } from './implementations/NavigationService';
import { AuthService, type AuthHookResult } from './implementations/AuthService';
import { ModalService } from './implementations/ModalService';
import { NotificationService } from './implementations/NotificationService';
import { notificationDataService } from './notificationDataService';
import { feedService } from './feedService';
import type { NavigateFunction } from 'react-router-dom';

/**
 * Concrete implementation of the service container
 * This is the main DI container that creates and manages all services
 */
export class ServiceContainer implements IServiceContainer {
  public readonly navigationService;
  public readonly authService;
  public readonly modalService;
  public readonly notificationService;
  public readonly notificationDataService;
  public readonly feedService;

  constructor(navigate: NavigateFunction, authHook: AuthHookResult) {
    // Create service instances
    this.navigationService = new NavigationService(navigate);
    this.authService = new AuthService(authHook);
    this.modalService = new ModalService();
    this.notificationService = new NotificationService();
    // Use singleton barrel exports for GraphQL services
    this.notificationDataService = notificationDataService;
    this.feedService = feedService;
  }

  /**
   * Create a service container with all dependencies
   */
  static create(navigate: NavigateFunction, authHook: AuthHookResult): ServiceContainer {
    return new ServiceContainer(navigate, authHook);
  }
}

/**
 * Factory function for creating service containers
 * This is useful for testing and provides a clean creation interface
 */
export const createServiceContainer = (
  navigate: NavigateFunction,
  authHook: AuthHookResult
): IServiceContainer => ServiceContainer.create(navigate, authHook);
