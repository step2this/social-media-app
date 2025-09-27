import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface LeftSidebarProps {
  collapsed?: boolean;
  className?: string;
}

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
  const { user } = useAuth();

  const navigationItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/explore', label: 'Explore', icon: '🔍' },
    { path: '/create', label: 'Create', icon: '➕' },
    { path: '/messages', label: 'Messages', icon: '💬' },
    { path: '/profile', label: 'Profile', icon: '👤' },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
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
                <span className="nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                {!collapsed && (
                  <span className="nav-label">{item.label}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Create Post Button */}
      {!collapsed && (
        <div className="sidebar-actions">
          <Link
            to="/create"
            className="create-post-btn tama-btn tama-btn--automotive tama-btn--racing-red"
            aria-label="Create new post"
          >
            🌟 Create Post
          </Link>
        </div>
      )}

      {/* User Mini Profile */}
      {!collapsed && user && (
        <div className="user-mini-profile">
          <Link to="/profile" className="mini-profile-link">
            <div className="mini-profile-avatar">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="Your profile"
                  className="mini-avatar-image"
                />
              ) : (
                <div className="mini-avatar-placeholder">
                  <span className="mini-avatar-icon">👤</span>
                </div>
              )}
            </div>
            <div className="mini-profile-info">
              <div className="mini-profile-name">
                {user.fullName || `@${user.username}`}
              </div>
              <div className="mini-profile-handle">
                @{user.username}
              </div>
            </div>
          </Link>
        </div>
      )}
    </aside>
  );
};