import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '../../hooks/useAuth';

// Mock useAuth hook
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

// Mock react-router-dom Navigate component
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to, state }: { to: string; state?: any }) => (
      <div data-testid="navigate" data-to={to} data-state={JSON.stringify(state)}>
        Redirecting to {to}
      </div>
    )
  };
});

const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authenticated User Access', () => {
    it('should render protected content when user is authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        isHydrated: true,
        tokens: { accessToken: 'test-token', refreshToken: 'test-refresh', expiresIn: 3600 },
        checkSession: vi.fn().mockResolvedValue(true)
      } as any);

      renderWithRouter(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      // Wait for session check to complete
      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });

    it('should redirect authenticated users away from guest-only routes', async () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        isHydrated: true,
        tokens: { accessToken: 'test-token', refreshToken: 'test-refresh', expiresIn: 3600 },
        checkSession: vi.fn().mockResolvedValue(true)
      } as any);

      renderWithRouter(
        <ProtectedRoute requireAuth={false}>
          <TestComponent />
        </ProtectedRoute>
      );

      // Wait for session check and redirect
      await waitFor(() => {
        expect(screen.getByTestId('navigate')).toBeInTheDocument();
      });

      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/');
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('Unauthenticated User Access', () => {
    it('should redirect unauthenticated users to login', () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        isHydrated: true,
        tokens: null,
        checkSession: vi.fn()
      } as any);

      renderWithRouter(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      // Should redirect to login
      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should redirect to custom location when specified', () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        isHydrated: true,
        tokens: null,
        checkSession: vi.fn()
      } as any);

      renderWithRouter(
        <ProtectedRoute redirectTo="/signin">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/signin');
    });

    it('should allow unauthenticated users to access guest-only routes', () => {
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        isHydrated: true,
        tokens: null,
        checkSession: vi.fn()
      } as any);

      renderWithRouter(
        <ProtectedRoute requireAuth={false}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });
});