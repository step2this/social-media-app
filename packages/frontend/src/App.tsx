import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute.js';
import { AuthModal } from './components/auth/AuthModal.js';
import { useAuth } from './hooks/useAuth.js';
import { HelloWorld } from './components/HelloWorld';
import { ProfilePage } from './components/profile/ProfilePage';
import { MyProfilePage } from './components/profile/MyProfilePage';
import { AppLayout } from './components/layout/AppLayout';
import { ContentLayout } from './components/layout/AppLayout';
import './App.css';

function App() {
  const { isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <Router>
      {isAuthenticated ? (
        <AppLayout>
          <Routes>
            <Route path="/" element={
              <ProtectedRoute requireAuth={true}>
                <ContentLayout>
                  <HelloWorld />
                </ContentLayout>
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute requireAuth={true}>
                <MyProfilePage />
              </ProtectedRoute>
            } />

            <Route path="/profile/:handle" element={
              <ProfilePage />
            } />

            <Route path="/explore" element={
              <ProtectedRoute requireAuth={true}>
                <ContentLayout>
                  <div className="placeholder-page">
                    <h2 className="neon-text">Explore</h2>
                    <p>Discover new content and users</p>
                  </div>
                </ContentLayout>
              </ProtectedRoute>
            } />

            <Route path="/create" element={
              <ProtectedRoute requireAuth={true}>
                <ContentLayout>
                  <div className="placeholder-page">
                    <h2 className="neon-text">Create Post</h2>
                    <p>Share your adventures</p>
                  </div>
                </ContentLayout>
              </ProtectedRoute>
            } />

            <Route path="/messages" element={
              <ProtectedRoute requireAuth={true}>
                <ContentLayout>
                  <div className="placeholder-page">
                    <h2 className="neon-text">Messages</h2>
                    <p>Connect with other users</p>
                  </div>
                </ContentLayout>
              </ProtectedRoute>
            } />

            <Route path="/settings" element={
              <ProtectedRoute requireAuth={true}>
                <ContentLayout>
                  <div className="placeholder-page">
                    <h2 className="neon-text">Settings</h2>
                    <p>Customize your experience</p>
                  </div>
                </ContentLayout>
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      ) : (
        <div className="guest-layout">
          <div className="guest-layout__hero">
            <div className="hero-content">
              <h1 className="hero-title gradient-text">SlopeShare</h1>
              <p className="hero-subtitle">Share your mountain adventures with the world</p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="btn-retro hero-cta"
              >
                Get Started
              </button>
            </div>
            <div className="hero-visual">
              <div className="retro-card hero-card">
                <div className="hero-card__glow"></div>
                <div className="hero-card__content">
                  <div className="neon-text">80s VIBES</div>
                  <div className="hero-features">
                    <div>📸 Share Photos</div>
                    <div>🎿 Connect with Riders</div>
                    <div>🏔️ Discover Slopes</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Routes>
            <Route path="/login" element={
              <ProtectedRoute requireAuth={false}>
                <div className="login-redirect">
                  <p>Use the "Get Started" button above to sign in</p>
                </div>
              </ProtectedRoute>
            } />
            <Route path="*" element={null} />
          </Routes>

          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onSuccess={() => setShowAuthModal(false)}
          />
        </div>
      )}
    </Router>
  );
}

export default App;