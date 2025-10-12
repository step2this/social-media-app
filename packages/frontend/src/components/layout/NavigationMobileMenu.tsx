/**
 * Mobile menu component for navigation
 * @module NavigationMobileMenu
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { MobileUserHeader } from './NavigationUserMenu';
import { NavigationItem } from './NavigationItem';
import {
  HomeIcon,
  ExploreIcon,
  CreateIcon,
  NotificationIcon,
  InboxIcon,
  ProfileIcon,
  LogoutIcon
} from './NavigationIcons';

/**
 * User type interface
 */
interface User {
  username: string;
  fullName?: string;
  profilePictureThumbnailUrl?: string;
}

/**
 * Props for NavigationMobileMenu component
 */
interface NavigationMobileMenuProps {
  user: User | null;
  showMobileMenu: boolean;
  onCloseMobileMenu: () => void;
  onLogout: () => void;
}

/**
 * Mobile navigation items configuration
 */
const getMobileNavItems = (pathname: string, onClose: () => void) => [
  {
    to: '/',
    icon: <HomeIcon />,
    label: 'Home',
    isActive: pathname === '/',
    onClick: onClose
  },
  {
    to: '/explore',
    icon: <ExploreIcon />,
    label: 'Explore',
    isActive: pathname === '/explore',
    onClick: onClose
  },
  {
    to: '/create',
    icon: <CreateIcon />,
    label: 'Create',
    isActive: pathname === '/create',
    onClick: onClose
  },
  {
    to: '/notifications',
    icon: <NotificationIcon />,
    label: 'Notifications',
    isActive: pathname === '/notifications',
    onClick: onClose
  },
  {
    to: '/messages',
    icon: <InboxIcon />,
    label: 'Messages',
    isActive: pathname === '/messages',
    onClick: onClose
  },
  {
    to: '/profile',
    icon: <ProfileIcon />,
    label: 'Profile',
    isActive: pathname === '/profile',
    onClick: onClose
  }
];

/**
 * Mobile menu component for navigation
 * @param {NavigationMobileMenuProps} props - Component props
 * @returns {JSX.Element | null} Mobile menu component
 */
export const NavigationMobileMenu: React.FC<NavigationMobileMenuProps> = ({
  user,
  showMobileMenu,
  onCloseMobileMenu,
  onLogout
}) => {
  const location = useLocation();

  if (!showMobileMenu) return null;

  const navItems = getMobileNavItems(location.pathname, onCloseMobileMenu);

  return (
    <div className="mobile-menu show-mobile">
      <div className="mobile-menu__overlay" onClick={onCloseMobileMenu} />
      <nav className="mobile-menu__content retro-card">
        <MobileUserHeader user={user} />

        <div className="mobile-menu__nav">
          {navItems.map(item => (
            <NavigationItem key={item.to} {...item} />
          ))}
        </div>

        <div className="mobile-menu__footer">
          <button onClick={onLogout} className="logout-btn">
            <LogoutIcon />
            Log Out
          </button>
        </div>
      </nav>
    </div>
  );
};