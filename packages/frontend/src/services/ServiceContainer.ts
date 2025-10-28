import type { IServiceContainer } from './interfaces/IServiceContainer';
import { NavigationService } from './implementations/NavigationService';
import { AuthService, type AuthHookResult } from './implementations/AuthService';
import { ModalService } from './implementations/ModalService';
import { NotificationService } from './implementations/NotificationService';
import { NotificationDataServiceGraphQL } from './implementations/NotificationDataService.graphql';
import { graphqlClient } from '../graphql/client';
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

  constructor(navigate: NavigateFunction, authHook: AuthHookResult) {
    // Create service instances
    this.navigationService = new NavigationService(navigate);
    this.authService = new AuthService(authHook);
    this.modalService = new ModalService();
    this.notificationService = new NotificationService();
    this.notificationDataService = new NotificationDataServiceGraphQL(graphqlClient);
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