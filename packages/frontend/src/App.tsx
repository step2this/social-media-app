import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute.js';
import { AuthModal } from './components/auth/AuthModal.js';
import { useAuth } from './hooks/useAuth.js';
import { HelloWorld } from './components/HelloWorld';
import { ProfilePage } from './components/profile/ProfilePage';
import './App.css';

function App() {
  const { isAuthenticated, user, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <h1>Social Media App</h1>
          <nav className="app-nav">
            {isAuthenticated && user ? (
              <div className="nav-user">
                <span>Welcome, {user.username}!</span>
                <button onClick={logout} className="btn btn-secondary">
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="btn btn-primary"
              >
                Sign In
              </button>
            )}
          </nav>
        </header>

        <main className="app-main">
          <Routes>
            <Route path="/login" element={
              <ProtectedRoute requireAuth={false}>
                <div>Login page - use the Sign In button</div>
              </ProtectedRoute>
            } />

            <Route path="/" element={
              <ProtectedRoute requireAuth={true}>
                <HelloWorld />
              </ProtectedRoute>
            } />

            <Route path="/profile/:handle" element={
              <ProfilePage />
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      </div>
    </Router>
  );
}

export default App;