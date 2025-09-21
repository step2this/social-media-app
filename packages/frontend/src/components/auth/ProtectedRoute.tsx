import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = '/login',
  requireAuth = true
}) => {
  const { isAuthenticated, isLoading, checkSession } = useAuth();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const verifySession = async () => {
      if (isAuthenticated) {
        // If already authenticated, verify the session is still valid
        try {
          await checkSession();
        } catch {
          // Session check handled by useAuth hook
        }
      }
      setIsCheckingSession(false);
    };

    verifySession();
  }, [isAuthenticated, checkSession]);

  // Show loading while checking session or auth operations
  if (isLoading || isCheckingSession) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Checking authentication...</p>
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    // Save the attempted location for redirect after login
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location }}
        replace
      />
    );
  }

  // If user is authenticated but shouldn't be (e.g., login page when logged in)
  if (!requireAuth && isAuthenticated) {
    // Redirect to home or dashboard
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};