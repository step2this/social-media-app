import { Metadata } from 'next';
import { logger } from '@/lib/logger';

export const metadata: Metadata = {
  title: 'Settings',
};

export default function SettingsPage() {
  logger.info('Settings page accessed');

  return (
    <div>
      <h1>Settings</h1>
      <p style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '8px', color: '#1976d2' }}>
        Settings will be implemented in a future phase.
      </p>
    </div>
  );
}
