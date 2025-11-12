'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Home', icon: 'home' },
    { href: '/explore', label: 'Explore', icon: 'explore' },
    { href: '/notifications', label: 'Notifications', icon: 'notifications' },
    { href: '/messages', label: 'Messages', icon: 'mail' },
    { href: '/create', label: 'Create', icon: 'add_circle' },
    { href: '/settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <h1>TamaFriends</h1>
      </div>
      <ul className="sidebar-links">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={pathname === link.href ? 'active' : ''}
            >
              <span className="material-icons">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
