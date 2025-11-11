import type { NavigateFunction } from 'react-router-dom';
import type { INavigationService } from '../interfaces/INavigationService.js';

/**
 * Concrete implementation of navigation service using React Router
 * This wraps the useNavigate hook to provide a clean, testable interface
 */
export class NavigationService implements INavigationService {
  private readonly navigate: NavigateFunction;

  constructor(navigate: NavigateFunction) {
    this.navigate = navigate;
  }

  navigateToProfile(): void {
    this.navigate('/profile');
  }

  navigateToHome(): void {
    this.navigate('/');
  }

  navigateToExplore(): void {
    this.navigate('/explore');
  }

  navigateToRoute(route: string): void {
    this.navigate(route);
  }

  goBack(): void {
    this.navigate(-1);
  }

  replaceRoute(route: string): void {
    this.navigate(route, { replace: true });
  }
}

/**
 * Factory function for creating NavigationService instances
 * Useful for dependency injection and testing
 */
export const createNavigationService = (navigate: NavigateFunction): INavigationService => {
  return new NavigationService(navigate);
};