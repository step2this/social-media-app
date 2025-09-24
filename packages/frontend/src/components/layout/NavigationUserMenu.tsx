/**
 * User menu component for navigation
 * @module NavigationUserMenu
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ProfileIcon, SettingsIcon, LogoutIcon } from './NavigationIcons';

/**
 * User type interface
 */
interface User {
  username: string;
  fullName?: string;
  profilePictureThumbnailUrl?: string;
}

/**
 * Props for NavigationUserMenu component
 */
interface NavigationUserMenuProps {
  user: User | null;
  showUserMenu: boolean;
  onToggleUserMenu: () => void;
  onLogout: () => void;
}

/**
 * User avatar component
 * @param {Object} props - Component props
 * @param {User | null} props.user - User object
 * @returns {JSX.Element} User avatar element
 */
const UserAvatar: React.FC<{ user: User | null }> = ({ user }) => (
  <>
    {user?.profilePictureThumbnailUrl ? (
      <img
        src={user.profilePictureThumbnailUrl}
        alt={user.username}
        className="avatar-image"
      />
    ) : (
      <div className="avatar-placeholder">
        {user?.username?.charAt(0).toUpperCase() || 'U'}
      </div>
    )}
  </>
);

/**
 * User menu dropdown component
 * @param {NavigationUserMenuProps} props - Component props
 * @returns {JSX.Element} User menu dropdown element
 */
const UserMenuDropdown: React.FC<{ user: User | null; onLogout: () => void }> = ({ user, onLogout }) => (
  <div className="user-menu retro-card">
    <div className="user-menu__header">
      <div className="user-info">
        <div className="user-info__name">
          @{user?.username}
        </div>
        {user?.fullName && (
          <div className="user-info__full-name">
            {user.fullName}
          </div>
        )}
      </div>
    </div>
    <div className="user-menu__divider"></div>
    <div className="user-menu__actions">
      <Link to="/profile" className="user-menu__item">
        <ProfileIcon />
        Your Profile
      </Link>
      <Link to="/settings" className="user-menu__item">
        <SettingsIcon />
        Settings
      </Link>
      <button onClick={onLogout} className="user-menu__item user-menu__item--logout">
        <LogoutIcon />
        Log Out
      </button>
    </div>
  </div>
);

/**
 * Navigation user menu component
 * @param {NavigationUserMenuProps} props - Component props
 * @returns {JSX.Element | null} User menu component
 */
export const NavigationUserMenu: React.FC<NavigationUserMenuProps> = ({
  user,
  showUserMenu,
  onToggleUserMenu,
  onLogout
}) => (
  <div className="navigation__user hidden-mobile">
    <button
      className="user-avatar"
      onClick={onToggleUserMenu}
      aria-label="User menu"
    >
      <UserAvatar user={user} />
    </button>
    {showUserMenu && <UserMenuDropdown user={user} onLogout={onLogout} />}
  </div>
);

/**
 * Mobile user header component for mobile menu
 * @param {Object} props - Component props
 * @param {User | null} props.user - User object
 * @returns {JSX.Element} Mobile user header element
 */
export const MobileUserHeader: React.FC<{ user: User | null }> = ({ user }) => (
  <div className="mobile-menu__header">
    <div className="user-info">
      <div className="user-avatar-mobile">
        <UserAvatar user={user} />
      </div>
      <div className="user-details">
        <div className="user-info__name">
          @{user?.username}
        </div>
        {user?.fullName && (
          <div className="user-info__full-name">
            {user.fullName}
          </div>
        )}
      </div>
    </div>
  </div>
);