import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { MaterialIcon } from './MaterialIcon';

interface AccountDropdownProps {
  className?: string;
}

export const AccountDropdown: React.FC<AccountDropdownProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  return (
    <div className={`account-dropdown ${className}`} ref={dropdownRef}>
      <button
        className="account-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Account menu"
        aria-expanded={isOpen}
      >
        <MaterialIcon name="account_circle" variant="outlined" size="md" />
        <span className="account-label">Account</span>
        <MaterialIcon
          name={isOpen ? "keyboard_arrow_up" : "keyboard_arrow_down"}
          variant="outlined"
          size="sm"
        />
      </button>

      {isOpen && (
        <div className="account-menu">
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
              onClick={() => setIsOpen(false)}
            >
              <MaterialIcon name="settings" variant="outlined" size="sm" />
              <span>Settings</span>
            </button>

            <button
              className="account-menu-item"
              onClick={() => setIsOpen(false)}
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
    </div>
  );
};