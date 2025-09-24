/**
 * Navigation item component
 * @module NavigationItem
 */

import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Props for NavigationItem component
 */
interface NavigationItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

/**
 * Navigation item component
 * @param {NavigationItemProps} props - Component props
 * @returns {JSX.Element} Navigation item element
 */
export const NavigationItem: React.FC<NavigationItemProps> = ({
  to,
  icon,
  label,
  isActive,
  onClick
}) => (
  <Link
    to={to}
    className={`nav-item ${isActive ? 'nav-item--active' : ''}`}
    onClick={onClick}
    aria-label={label}
  >
    <div className="nav-item__icon">
      {icon}
    </div>
    <span className="nav-item__label hidden-mobile">
      {label}
    </span>
  </Link>
);