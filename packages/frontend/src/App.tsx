import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute.js';
import { AuthModal } from './components/auth/AuthModal.js';
import { ProfilePage } from './components/profile/ProfilePage';
import { MyProfilePage } from './components/profile/MyProfilePage';
import { HomePage } from './pages/HomePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { PlaceholderPage } from './components/common/PlaceholderPage';
import { CreatePostPage } from './components/posts/index.js';
import { PostDetailPage } from './components/posts/PostDetailPage';
import { ExplorePage } from './components/explore/ExplorePage';
import { AppLayout } from './components/layout/AppLayout';
import { DesignSystemTest } from './components/design-system/DesignSystemTest.js';
import { ServiceProvider, useServices } from './services/ServiceProvider';
import { useAuthStore } from './stores/authStore.js';
import './App.css';

/**
 * Internal app content component that uses dependency injection
 * This component is now pure and testable because it depends on abstractions
 */
function AppContent() {
  // Access services through dependency injection
  const { navigationService, modalService, notificationService } = useServices();

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

  // Removed automatic redirect - was causing navigation issues
  // Navigation to profile now happens only in handleAuthSuccess

  /**
   * Handle successful authentication (registration or login)
   * This is now pure business logic, easy to test
   */
  const handleAuthSuccess = useCallback(() => {
    // Close the modal through the service
    modalService.closeAuthModal();

    // Show success notification and navigate to profile
    notificationService.showSuccess('Welcome! Redirecting to your profile...');

    // Navigate to profile only on actual authentication success
    navigationService.navigateToProfile();
  }, [modalService, notificationService, navigationService]);

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
              <HomePage />
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
              <ExplorePage />
            </ProtectedRoute>
          } />

          <Route path="/create" element={
            <ProtectedRoute requireAuth={true}>
              <CreatePostPage />
            </ProtectedRoute>
          } />

          <Route path="/post/:postId" element={
            <ProtectedRoute requireAuth={true}>
              <PostDetailPage />
            </ProtectedRoute>
          } />

          <Route path="/notifications" element={
            <ProtectedRoute requireAuth={true}>
              <NotificationsPage />
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

          <Route path="/design-test" element={
            <ProtectedRoute requireAuth={true}>
              <DesignSystemTest />
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
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <ServiceProvider>
        <AppContent />
      </ServiceProvider>
    </Router>
  );
}

export default App;