import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLazyLoadQuery, graphql } from 'react-relay';
import type { LeftSidebarQuery } from './__generated__/LeftSidebarQuery.graphql';
import { useAuth } from '../../hooks/useAuth';
import { MaterialIcon } from '../common/MaterialIcon';

interface LeftSidebarProps {
  collapsed?: boolean;
  className?: string;
}

/**
 * Notification badge component that fetches unread count using Relay
 * Isolated in its own component to avoid blocking sidebar render
 */
const NotificationBadge: React.FC = () => {
  const data = useLazyLoadQuery<LeftSidebarQuery>(
    graphql`
      query LeftSidebarQuery {
        unreadNotificationsCount
      }
    `,
    {},
    { fetchPolicy: 'store-and-network' }
  );

  const unreadCount = data.unreadNotificationsCount;

  if (unreadCount === 0) {
    return null;
  }

  return (
    <span className="nav-badge">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  );
};

/**
 * Left sidebar component following wireframe specifications
 * - 280px width on desktop
 * - 80px width (icon-only) on tablet
 * - Hidden on mobile
 */
export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  collapsed = false,
  className = ''
}) => {
  const location = useLocation();
  const { user, logout, isAuthenticated, isHydrated } = useAuth();
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);

  // Debug logging for account button visibility
  useEffect(() => {
    console.log('LeftSidebar debug:', {
      user: !!user,
      isAuthenticated,
      isHydrated,
      userEmail: user?.email
    });
  }, [user, isAuthenticated, isHydrated]);

  // Debug logging for dropdown state changes
  useEffect(() => {
    console.log('Account dropdown state changed to:', isAccountDropdownOpen);
  }, [isAccountDropdownOpen]);

  const navigationItems = [
    { path: '/', label: 'Home', icon: 'home', activeIcon: 'home' },
    { path: '/explore', label: 'Explore', icon: 'explore', activeIcon: 'explore' },
    { path: '/notifications', label: 'Notifications', icon: 'notifications_outlined', activeIcon: 'notifications', showBadge: true },
    { path: '/create', label: 'Create', icon: 'add_circle_outline', activeIcon: 'add_circle' },
    { path: '/messages', label: 'Messages', icon: 'chat_bubble_outline', activeIcon: 'chat_bubble' },
    { path: '/profile', label: 'Profile', icon: 'person_outline', activeIcon: 'person' },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setIsAccountDropdownOpen(false);
  };

  return (
    <aside className={`left-sidebar ${collapsed ? 'left-sidebar--collapsed' : ''} ${className}`}>
      {/* Navigation Menu */}
      <nav className="sidebar-navigation" role="navigation" aria-label="Main navigation">
        <ul className="nav-list">
          {navigationItems.map((item) => (
            <li key={item.path} className="nav-item">
              <Link
                to={item.path}
                className={`nav-link nav-link--automotive ${
                  isActive(item.path) ? 'nav-link--active' : ''
                }`}
                aria-current={isActive(item.path) ? 'page' : undefined}
              >
                <MaterialIcon
                  name={isActive(item.path) ? item.activeIcon : item.icon}
                  variant={isActive(item.path) ? 'filled' : 'outlined'}
                  className="nav-icon"
                />
                {!collapsed && item.label && (
                  <span className="nav-label">{item.label}</span>
                )}
                {!collapsed && item.showBadge && (
                  <Suspense fallback={null}>
                    <NotificationBadge />
                  </Suspense>
                )}
              </Link>
            </li>
          ))}

          {/* Account Dropdown integrated as navigation item */}
          {user && (
            <li className="nav-item" ref={dropdownRef}>
              <button
                type="button"
                className="nav-link nav-link--automotive account-trigger"
                onClick={() => {
                  console.log('Account button clicked, current state:', isAccountDropdownOpen);
                  console.log('Toggling to:', !isAccountDropdownOpen);
                  setIsAccountDropdownOpen(!isAccountDropdownOpen);
                  console.log('State after toggle call (may not be updated yet):', isAccountDropdownOpen);
                }}
                aria-label="Account menu"
                aria-expanded={isAccountDropdownOpen}
              >
                <MaterialIcon name="account_circle" variant="outlined" className="nav-icon" />
                {!collapsed && (
                  <span className="nav-label">Account</span>
                )}
                {!collapsed && (
                  <MaterialIcon
                    name={isAccountDropdownOpen ? "keyboard_arrow_up" : "keyboard_arrow_down"}
                    variant="outlined"
                    className="nav-icon nav-icon--arrow"
                  />
                )}
              </button>

              {isAccountDropdownOpen && (
                <div className={`account-menu ${collapsed ? 'account-menu--collapsed' : ''}`}>
                  <div className="account-menu-header">
                    <div className="account-avatar">
                      <MaterialIcon name="account_circle" variant="filled" size="lg" />
                    </div>
                    <div className="account-info">
                      <div className="account-name">
                        {user?.username || 'User'}
                      </div>
                      <div className="account-email">
                        {user?.email || 'user@example.com'}
                      </div>
                    </div>
                  </div>

                  <div className="account-menu-divider" />

                  <div className="account-menu-items">
                    <button
                      className="account-menu-item"
                      onClick={() => setIsAccountDropdownOpen(false)}
                    >
                      <MaterialIcon name="settings" variant="outlined" size="sm" />
                      <span>Settings</span>
                    </button>

                    <button
                      className="account-menu-item"
                      onClick={() => setIsAccountDropdownOpen(false)}
                    >
                      <MaterialIcon name="help_outline" variant="outlined" size="sm" />
                      <span>Help</span>
                    </button>

                    <div className="account-menu-divider" />

                    <button
                      className="account-menu-item account-menu-item--logout"
                      onClick={handleLogout}
                    >
                      <MaterialIcon name="logout" variant="outlined" size="sm" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </li>
          )}
        </ul>
      </nav>
    </aside>
  );
};
