import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MaterialIcon } from '../common/MaterialIcon';

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
    { path: '/', label: 'Home', icon: 'home', activeIcon: 'home' },
    { path: '/explore', label: 'Explore', icon: 'explore', activeIcon: 'explore' },
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
              <MaterialIcon
                name={active ? tab.activeIcon : tab.icon}
                variant={active ? 'filled' : 'outlined'}
                className="mobile-tab-icon"
              />
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