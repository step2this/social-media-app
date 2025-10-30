/**
 * Test Provider Utilities
 *
 * Provides reusable test wrappers with all required providers.
 * Pattern follows NOTIFICATION_SERVICE_IMPLEMENTATION.md.
 *
 * Supports dependency injection for testing by accepting optional serviceContainer.
 * This enables proper mocking of services without singleton violations.
 *
 * @example
 * ```typescript
 * import { renderWithProviders } from './test-providers';
 *
 * // Basic usage - uses real services
 * it('should render', () => {
 *   renderWithProviders(<MyComponent />);
 *   // Component has access to BrowserRouter and ServiceProvider
 * });
 *
 * // Advanced usage - inject mock services
 * it('should render with mocks', () => {
 *   const mockServices = createMockServiceContainer({
 *     feedService: mockFeedService
 *   });
 *   renderWithProviders(<MyComponent />, { serviceContainer: mockServices });
 * });
 * ```
 */

import { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { ServiceProvider } from '../services/ServiceProvider';
import type { IServiceContainer } from '../services/interfaces/IServiceContainer';

/**
 * Props for AllProviders wrapper component
 */
interface AllProvidersProps {
  readonly children: ReactNode;
  readonly serviceContainer?: IServiceContainer;
}

/**
 * Wrapper component with all required providers
 *
 * Provides:
 * - BrowserRouter for routing context
 * - ServiceProvider for DI container access
 *
 * Supports optional serviceContainer injection for testing with mocks.
 *
 * @param children - React elements to wrap
 * @param serviceContainer - Optional DI container for testing (injects mocked services)
 */
export function AllProviders({ children, serviceContainer }: AllProvidersProps) {
  return (
    <BrowserRouter>
      <ServiceProvider serviceContainer={serviceContainer}>
        {children}
      </ServiceProvider>
    </BrowserRouter>
  );
}

/**
 * Options for renderWithProviders
 */
interface RenderWithProvidersOptions {
  /**
   * Optional service container for dependency injection in tests.
   * When provided, components will use these mocked services instead of real ones.
   *
   * @example
   * ```typescript
   * const mockServices = createMockServiceContainer({
   *   feedService: mockFeedService
   * });
   * renderWithProviders(<HomePage />, { serviceContainer: mockServices });
   * ```
   */
  readonly serviceContainer?: IServiceContainer;
}

/**
 * Render helper with providers pre-configured
 *
 * Drop-in replacement for @testing-library/react's render().
 * Automatically wraps component with BrowserRouter and ServiceProvider.
 *
 * Supports optional serviceContainer injection for testing with mocked services.
 * This enables proper DI testing without singleton violations.
 *
 * @param ui - React element to render
 * @param options - Optional configuration including serviceContainer
 * @returns Render result from @testing-library/react
 *
 * @example
 * ```typescript
 * // Basic usage - real services
 * const { getByText } = renderWithProviders(<HomePage />);
 * expect(getByText('Welcome')).toBeInTheDocument();
 *
 * // Advanced usage - mock services
 * const mockServices = createMockServiceContainer();
 * const { getByText } = renderWithProviders(<HomePage />, { serviceContainer: mockServices });
 * ```
 */
export function renderWithProviders(
  ui: ReactNode,
  options?: RenderWithProvidersOptions
): ReturnType<typeof render> {
  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders serviceContainer={options?.serviceContainer}>
        {children}
      </AllProviders>
    )
  });
}
