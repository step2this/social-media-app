import type { IServiceContainer } from './interfaces/IServiceContainer.js';
import { NavigationService } from './implementations/NavigationService.js';
import { AuthService, type AuthHookResult } from './implementations/AuthService.js';
import { ModalService } from './implementations/ModalService.js';
import { NotificationService } from './implementations/NotificationService.js';
import type { NavigateFunction } from 'react-router-dom';

/**
 * Concrete implementation of the service container
 * This is the main DI container that creates and manages all services
 *
 * Note: GraphQL data services (Feed, Profile, Post, Comment, Like, Auction, Follow, NotificationData)
 * have been replaced with Relay hooks. Use Relay hooks directly instead.
 */
export class ServiceContainer implements IServiceContainer {
  public readonly navigationService;
  public readonly authService;
  public readonly modalService;
  public readonly notificationService;

  constructor(navigate: NavigateFunction, authHook: AuthHookResult) {
    // Create service instances
    this.navigationService = new NavigationService(navigate);
    this.authService = new AuthService(authHook);
    this.modalService = new ModalService();
    this.notificationService = new NotificationService();
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
