import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { ReactElement } from 'react';

/**
 * Render component wrapped in MemoryRouter for testing
 *
 * Use this for components that need router context but don't require
 * specific route configuration or URL parameters.
 *
 * @param component - React component to render
 * @returns Render result from React Testing Library
 *
 * @example
 * ```typescript
 * const { getByText } = renderWithRouter(<MyComponent />);
 * ```
 */
export const renderWithRouter = (component: ReactElement) => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

/**
 * Render component in MemoryRouter with route configuration
 *
 * Use this for components that depend on route parameters or need
 * to be tested at specific URLs. The MemoryRouter allows you to
 * control the browser history without affecting the actual browser.
 *
 * @param element - React component to render
 * @param path - Route path pattern (e.g., '/post/:postId')
 * @param initialEntry - Initial URL to navigate to (e.g., '/post/123')
 * @returns Render result from React Testing Library
 *
 * @example
 * ```typescript
 * const { getByText } = renderWithRoutes(
 *   <PostDetailPage />,
 *   '/post/:postId',
 *   '/post/123'
 * );
 * ```
 */
export const renderWithRoutes = (
  element: ReactElement,
  path: string,
  initialEntry: string
) => {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path={path} element={element} />
      </Routes>
    </MemoryRouter>
  );
};
