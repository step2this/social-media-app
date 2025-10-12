/**
 * Main navigation component for the application
 * @module Navigation
 */

import React, { useState, useCallback } from 'react';
import type { MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { NavigationItem } from './NavigationItem';
import { NavigationUserMenu } from './NavigationUserMenu';
import { NavigationMobileMenu } from './NavigationMobileMenu';
import {
  HomeIcon,
  ExploreIcon,
  CreateIcon,
  NotificationIcon,
  InboxIcon,
  ProfileIcon,
  MenuIcon,
  CloseIcon
} from './NavigationIcons';
import './Navigation.css';

/**
 * Props for Navigation component
 */
interface NavigationProps {
  className?: string;
}

/**
 * Guest navigation component (when user is not authenticated)
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Guest navigation element
 */
const GuestNavigation: React.FC<{ className: string }> = ({ className }) => (
  <header className={`navigation navigation--guest ${className}`}>
    <div className="navigation__container">
      <Link to="/" className="navigation__brand">
        <span className="navigation__logo tama-heading">TamaFriends</span>
      </Link>
      <nav className="navigation__auth">
        <Link to="/auth/login" className="tama-btn tama-btn--automotive">
          Sign In
        </Link>
      </nav>
    </div>
  </header>
);

/**
 * Search bar component
 * @returns {JSX.Element} Search bar element
 */
const SearchBar: React.FC = () => (
  <div className="navigation__search hidden-mobile">
    <input
      type="text"
      placeholder="Search friends, pets..."
      className="search-input"
    />
    <ExploreIcon />
  </div>
);

/**
 * Desktop navigation items
 * @param {Object} props - Component props
 * @param {string} props.pathname - Current pathname
 * @returns {JSX.Element} Desktop navigation element
 */
const DesktopNavItems: React.FC<{ pathname: string }> = ({ pathname }) => {
  const navItems = [
    { to: '/', icon: <HomeIcon />, label: 'Home', isActive: pathname === '/' },
    { to: '/explore', icon: <ExploreIcon />, label: 'Explore', isActive: pathname === '/explore' },
    { to: '/create', icon: <CreateIcon />, label: 'Create', isActive: pathname === '/create' },
    { to: '/notifications', icon: <NotificationIcon />, label: 'Notifications', isActive: pathname === '/notifications' },
    { to: '/messages', icon: <InboxIcon />, label: 'Messages', isActive: pathname === '/messages' },
    { to: '/profile', icon: <ProfileIcon />, label: 'Profile', isActive: pathname === '/profile' }
  ];

  return (
    <nav className="navigation__nav hidden-mobile">
      {navItems.map(item => (
        <NavigationItem key={item.to} {...item} />
      ))}
    </nav>
  );
};

/**
 * Mobile menu toggle button
 * @param {Object} props - Component props
 * @param {boolean} props.showMobileMenu - Whether mobile menu is shown
 * @param {Function} props.onToggle - Toggle handler
 * @returns {JSX.Element} Mobile toggle button element
 */
const MobileMenuToggle: React.FC<{ showMobileMenu: boolean; onToggle: () => void }> = ({
  showMobileMenu,
  onToggle
}) => (
  <button
    className="navigation__mobile-toggle show-mobile"
    onClick={onToggle}
    aria-label="Toggle mobile menu"
  >
    {showMobileMenu ? <CloseIcon /> : <MenuIcon />}
  </button>
);

/**
 * Main navigation component
 * @param {NavigationProps} props - Component props
 * @returns {JSX.Element} Navigation component
 */
export const Navigation: React.FC<NavigationProps> = ({ className = '' }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  /**
   * Handle user logout
   */
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [logout, navigate]);

  /**
   * Toggle mobile menu visibility
   */
  const toggleMobileMenu = useCallback(() => {
    setShowMobileMenu(prev => !prev);
  }, []);

  /**
   * Toggle user menu visibility
   */
  const toggleUserMenu = useCallback((e?: MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.stopPropagation();
    }
    setShowUserMenu(prev => !prev);
  }, []);

  /**
   * Close mobile menu
   */
  const closeMobileMenu = useCallback(() => {
    setShowMobileMenu(false);
  }, []);

  // Render guest navigation if user is not authenticated
  if (!isAuthenticated) {
    return <GuestNavigation className={className} />;
  }

  // Type assertion for user to ensure proper typing
  const typedUser = user as { username: string; fullName?: string; profilePictureThumbnailUrl?: string } | null;

  return (
    <>
      <header className={`navigation navigation--authenticated ${className}`}>
        <div className="navigation__container">
          <Link to="/" className="navigation__brand">
            <span className="navigation__logo tama-heading">TamaFriends</span>
          </Link>

          <SearchBar />
          <DesktopNavItems pathname={location.pathname} />

          <NavigationUserMenu
            user={typedUser}
            showUserMenu={showUserMenu}
            onToggleUserMenu={() => toggleUserMenu()}
            onLogout={handleLogout}
          />

          <MobileMenuToggle
            showMobileMenu={showMobileMenu}
            onToggle={toggleMobileMenu}
          />
        </div>
      </header>

      <NavigationMobileMenu
        user={typedUser}
        showMobileMenu={showMobileMenu}
        onCloseMobileMenu={closeMobileMenu}
        onLogout={handleLogout}
      />
    </>
  );
};