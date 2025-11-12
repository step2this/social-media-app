'use client';

import { useRouter } from 'next/navigation';

interface HeaderProps {
  user: {
    userId: string;
    email: string;
  };
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="user-info">
          <img
            src="/default-avatar.png"
            alt="User avatar"
            width={32}
            height={32}
          />
          <span>{user.email}</span>
        </div>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </header>
  );
}
