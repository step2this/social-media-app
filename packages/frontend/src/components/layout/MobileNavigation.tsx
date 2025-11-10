import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MaterialIcon } from '../common/MaterialIcon';
// import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../hooks/useAuth';

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
  const { isAuthenticated, isHydrated } = useAuth();
  const [unreadCount] = useState(0);

  // Fetch unread notification count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        // TODO: Implement getUnreadCount method in notificationService
        // const response = await notificationService.getUnreadCount();
        // setUnreadCount(response.count);
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };

    if (isAuthenticated && isHydrated) {
      fetchUnreadCount();
      // Poll every 30 seconds for updates
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }

    return undefined;
  }, [isAuthenticated, isHydrated]);

  const navigationTabs = [
    { path: '/', label: 'Home', icon: 'home', activeIcon: 'home' },
    { path: '/explore', label: 'Explore', icon: 'explore', activeIcon: 'explore' },
    { path: '/notifications', label: 'Notifications', icon: 'notifications_outlined', activeIcon: 'notifications', badge: unreadCount },
    { path: '/create', label: 'Create', icon: 'add_circle_outline', activeIcon: 'add_circle' },
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
              {tab.badge && tab.badge > 0 && (
                <span className="mobile-tab-badge">{tab.badge > 99 ? '99+' : tab.badge}</span>
              )}
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