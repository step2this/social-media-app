import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface MobileNavigationProps {
  className?: string;
}

/**
 * Mobile bottom navigation component following wireframe specifications
 * - Fixed bottom position
 * - 5 tab system for main navigation
 * - 44px minimum touch targets
 * - Automotive styling with French color accents
 */
export const MobileNavigation: React.FC<MobileNavigationProps> = ({ className = '' }) => {
  const location = useLocation();

  const navigationTabs = [
    { path: '/', label: 'Home', icon: '🏠', activeIcon: '🏠' },
    { path: '/explore', label: 'Explore', icon: '🔍', activeIcon: '🔍' },
    { path: '/create', label: 'Create', icon: '➕', activeIcon: '✨' },
    { path: '/messages', label: 'Messages', icon: '💬', activeIcon: '💬' },
    { path: '/profile', label: 'Profile', icon: '👤', activeIcon: '👤' },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className={`mobile-navigation mobile-nav--automotive ${className}`} role="navigation" aria-label="Main navigation">
      <div className="mobile-nav-container">
        {navigationTabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`mobile-tab mobile-tab--automotive ${
                active ? 'mobile-tab--active' : ''
              }`}
              aria-current={active ? 'page' : undefined}
              aria-label={`Navigate to ${tab.label}`}
            >
              <div className="mobile-tab-icon" aria-hidden="true">
                {active ? tab.activeIcon : tab.icon}
              </div>
              <div className="mobile-tab-label">
                {tab.label}
              </div>
              {active && <div className="mobile-tab-indicator" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};