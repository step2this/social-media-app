import React, { useCallback, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute.js';
import { AuthModal } from './components/auth/AuthModal.js';
import { HelloWorld } from './components/HelloWorld';
import { ProfilePage } from './components/profile/ProfilePage';
import { MyProfilePage } from './components/profile/MyProfilePage';
import { PlaceholderPage } from './components/common/PlaceholderPage';
import { AppLayout } from './components/layout/AppLayout';
import { ContentLayout } from './components/layout/AppLayout';
import { ServiceProvider, useServices } from './services/ServiceProvider';
import { useAuthStore } from './stores/authStore.js';
import './App.css';

/**
 * Internal app content component that uses dependency injection
 * This component is now pure and testable because it depends on abstractions
 */
function AppContent() {
  // Access services through dependency injection
  const { authService, navigationService, modalService, notificationService } = useServices();

  // Use reactive auth state for component re-renders (solves stale closure issue)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Local state for modal visibility (this could be moved to modalService completely)
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'login' | 'register'>('login');

  // Subscribe to modal service state changes
  useEffect(() => {
    const unsubscribe = modalService.onModalStateChange((isOpen, mode) => {
      setIsModalVisible(isOpen);
      setModalMode(mode);
    });

    return unsubscribe;
  }, [modalService]);

  // Declarative navigation: redirect to profile when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigationService.navigateToProfile();
    }
  }, [isAuthenticated, navigationService]);

  /**
   * Handle successful authentication (registration or login)
   * This is now pure business logic, easy to test
   */
  const handleAuthSuccess = useCallback(() => {
    // Close the modal through the service
    modalService.closeAuthModal();

    // Show success notification (navigation will happen automatically via useEffect)
    notificationService.showSuccess('Welcome! Redirecting to your profile...');
  }, [modalService, notificationService]);

  /**
   * Handle opening the auth modal
   */
  const handleOpenAuthModal = useCallback(() => {
    modalService.openLoginModal();
  }, [modalService]);

  /**
   * Handle closing the auth modal
   */
  const handleCloseAuthModal = useCallback(() => {
    modalService.closeAuthModal();
  }, [modalService]);

  // Render based on reactive authentication state
  if (isAuthenticated) {
    return (
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
              <PlaceholderPage
                icon="🔍"
                title="Explore"
                description="Discover new pets and friends in the TamaFriends community"
                features={["🐾 Browse Popular Pets", "🌟 Trending Adventures", "👥 Meet New Friends"]}
              />
            </ProtectedRoute>
          } />

          <Route path="/create" element={
            <ProtectedRoute requireAuth={true}>
              <PlaceholderPage
                icon="✨"
                title="Create Post"
                description="Share your pet's adventures with the world"
                features={["📸 Upload Photos", "📝 Tell Your Story", "🎯 Add Pet Stats"]}
              />
            </ProtectedRoute>
          } />

          <Route path="/messages" element={
            <ProtectedRoute requireAuth={true}>
              <PlaceholderPage
                icon="💬"
                title="Messages"
                description="Connect with other pet owners and share care tips"
                features={["📨 Direct Messages", "👥 Group Chats", "🎮 Pet Playdates"]}
              />
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute requireAuth={true}>
              <PlaceholderPage
                icon="⚙️"
                title="Settings"
                description="Customize your pet care experience"
                features={["🔔 Notifications", "🎨 Themes", "🔒 Privacy"]}
              />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    );
  }

  // Unauthenticated user view
  return (
    <div className="guest-layout">
      <div className="guest-layout__hero">
        <div className="hero-content">
          <h1 className="hero-title">TamaFriends</h1>
          <p className="hero-subtitle">Share your virtual pet adventures with friends</p>
          <button
            onClick={handleOpenAuthModal}
            className="tama-btn tama-btn--automotive tama-btn--racing-red hero-cta"
          >
            Get Started
          </button>
        </div>
        <div className="hero-visual">
          <div className="retro-card hero-card">
            <div className="hero-card__glow"></div>
            <div className="hero-card__content">
              <div className="tama-heading">PET CARE</div>
              <div className="hero-features">
                <div>🥚 Hatch & Raise Pets</div>
                <div>👥 Connect with Friends</div>
                <div>📱 Share Adventures</div>
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
        isOpen={isModalVisible}
        onClose={handleCloseAuthModal}
        onSuccess={handleAuthSuccess}
        initialMode={modalMode}
      />
    </div>
  );
}

/**
 * Main App component that sets up dependency injection
 * This component is responsible for:
 * 1. Setting up React Router
 * 2. Providing dependency injection context
 * 3. Rendering the app content
 */
function App() {
  return (
    <Router>
      <ServiceProvider>
        <AppContent />
      </ServiceProvider>
    </Router>
  );
}

export default App;