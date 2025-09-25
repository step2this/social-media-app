/**
 * Navigation service interface - abstracts routing concerns
 * This allows components to navigate without knowing about React Router implementation
 */
export interface INavigationService {
  /**
   * Navigate to the user's profile page
   */
  navigateToProfile(): void;

  /**
   * Navigate to the home/dashboard page
   */
  navigateToHome(): void;

  /**
   * Navigate to the explore page
   */
  navigateToExplore(): void;

  /**
   * Navigate to any specific route
   * @param route - The route path to navigate to
   */
  navigateToRoute(route: string): void;

  /**
   * Go back to previous page
   */
  goBack(): void;

  /**
   * Replace current route (doesn't add to history)
   * @param route - The route path to replace with
   */
  replaceRoute(route: string): void;
}