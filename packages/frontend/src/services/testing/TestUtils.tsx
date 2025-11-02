import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ServiceProvider } from '../ServiceProvider';
import type { IServiceContainer } from '../interfaces/IServiceContainer';
import { createMockServiceContainer, TestScenarios } from './MockServices';

/**
 * Custom render options that include service injection
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Mock services to inject into the component tree
   */
  services?: IServiceContainer;

  /**
   * Initial route for React Router (defaults to '/')
   */
  initialRoute?: string;

  /**
   * Additional routes to include in memory router
   */
  routes?: string[];

  /**
   * Whether to wrap with React Router (defaults to true)
   */
  includeRouter?: boolean;
}

/**
 * Enhanced render function that provides dependency injection for testing
 * This makes testing components with services incredibly easy
 */
export const renderWithServices = (
  ui: ReactElement<any>,
  options: CustomRenderOptions = {}
): RenderResult & { services: IServiceContainer } => {
  const {
    services = createMockServiceContainer(),
    initialRoute = '/',
    routes = ['/'],
    includeRouter = true,
    ...renderOptions
  } = options;

  // Create wrapper component with all necessary providers
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const content = (
      <ServiceProvider serviceContainer={services}>
        {children}
      </ServiceProvider>
    );

    // Conditionally wrap with router
    if (includeRouter) {
      return (
        <MemoryRouter
          initialEntries={[initialRoute, ...routes]}
          initialIndex={0}
        >
          {content}
        </MemoryRouter>
      );
    }

    return content;
  };

  const renderResult = render(ui, {
    wrapper: Wrapper,
    ...renderOptions,
  });

  // Return enhanced result with access to services for assertions
  return {
    ...renderResult,
    services,
  };
};

/**
 * Convenience functions for common test scenarios
 */
export const TestRenders: any = {
  /**
   * Render component for guest (unauthenticated) user
   */
  asGuest: (ui: ReactElement<any>, options?: Omit<CustomRenderOptions, 'services'>) =>
    renderWithServices(ui, {
      services: TestScenarios.guestUser(),
      ...options,
    }),

  /**
   * Render component for authenticated user
   */
  asAuthenticatedUser: (ui: ReactElement<any>, options?: Omit<CustomRenderOptions, 'services'>) =>
    renderWithServices(ui, {
      services: TestScenarios.authenticatedUser(),
      ...options,
    }),

  /**
   * Render component during authentication loading
   */
  duringAuthentication: (ui: ReactElement<any>, options?: Omit<CustomRenderOptions, 'services'>) =>
    renderWithServices(ui, {
      services: TestScenarios.authenticatingUser(),
      ...options,
    }),

  /**
   * Render component with authentication error
   */
  withAuthError: (ui: ReactElement<any>, error?: string, options?: Omit<CustomRenderOptions, 'services'>) =>
    renderWithServices(ui, {
      services: TestScenarios.authenticationError(error),
      ...options,
    }),

  /**
   * Render component with login modal open
   */
  withLoginModal: (ui: ReactElement<any>, options?: Omit<CustomRenderOptions, 'services'>) =>
    renderWithServices(ui, {
      services: TestScenarios.loginModalOpen(),
      ...options,
    }),

  /**
   * Render component with register modal open
   */
  withRegisterModal: (ui: ReactElement<any>, options?: Omit<CustomRenderOptions, 'services'>) =>
    renderWithServices(ui, {
      services: TestScenarios.registerModalOpen(),
      ...options,
    }),
};

/**
 * Utility function to extract service mocks from render result for assertions
 */
export const getServiceMocks = (renderResult: ReturnType<typeof renderWithServices>) => ({
  navigation: renderResult.services.navigationService,
  auth: renderResult.services.authService,
  modal: renderResult.services.modalService,
  notification: renderResult.services.notificationService,
});

/**
 * Custom hooks for testing service interactions
 */
export const TestHelpers = {
  /**
   * Simulate successful authentication
   */
  simulateAuthSuccess: (authService: any, user: any = null) => {
    authService.user = user;
    authService.isAuthenticated = true;
    authService.isLoading = false;
    authService.error = null;
  },

  /**
   * Simulate authentication error
   */
  simulateAuthError: (authService: any, error = 'Authentication failed') => {
    authService.user = null;
    authService.isAuthenticated = false;
    authService.isLoading = false;
    authService.error = error;
  },

  /**
   * Simulate loading state
   */
  simulateLoading: (authService: any) => {
    authService.isLoading = true;
    authService.error = null;
  },
};

// Re-export mock factories for convenience
export * from './MockServices';

// Re-export testing library utilities
export * from '@testing-library/react';
export * from '@testing-library/user-event';
