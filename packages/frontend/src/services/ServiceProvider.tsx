import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { IServiceContainer } from './interfaces/IServiceContainer';
import { createServiceContainer } from './ServiceContainer';

/**
 * React Context for dependency injection
 * This provides services throughout the component tree
 */
const ServiceContext = createContext<IServiceContainer | null>(null);

/**
 * Props for the ServiceProvider component
 */
interface ServiceProviderProps {
  children: ReactNode;
  /**
   * Optional service container for testing
   * If provided, this will be used instead of creating a new one
   */
  serviceContainer?: IServiceContainer;
}

/**
 * Service provider component that creates and provides services to child components
 * This is the main DI provider for the application
 */
export const ServiceProvider: React.FC<ServiceProviderProps> = ({
  children,
  serviceContainer: injectedServices
}) => {
  const navigate = useNavigate();
  const authHook = useAuth();

  // Create services container (memoized for performance)
  const services = useMemo(() => {
    // Use injected services for testing, or create real ones
    if (injectedServices) {
      return injectedServices;
    }

    return createServiceContainer(navigate, authHook);
  }, [navigate, authHook, injectedServices]);

  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
};

/**
 * Hook to access services from any component
 * This is the primary way components should access services
 */
export const useServices = (): IServiceContainer => {
  const services = useContext(ServiceContext);

  if (!services) {
    throw new Error(
      'useServices must be used within a ServiceProvider. ' +
      'Make sure your component is wrapped with <ServiceProvider>.'
    );
  }

  return services;
};

/**
 * Hook to access a specific service
 * This provides a convenient way to access individual services
 */
export const useNavigationService = () => useServices().navigationService;
export const useAuthService = () => useServices().authService;
export const useModalService = () => useServices().modalService;
export const useNotificationService = () => useServices().notificationService;

/**
 * Higher-order component for injecting services into components
 * This is useful for class components or when you need explicit injection
 */
export function withServices<TProps>(
  Component: React.ComponentType<TProps & { services: IServiceContainer }>
): React.ComponentType<TProps> {
  return function ServiceInjectedComponent(props: TProps) {
    const services = useServices();
    return <Component {...props} services={services} />;
  };
}