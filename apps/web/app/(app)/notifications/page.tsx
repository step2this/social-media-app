import { Metadata } from 'next';
import { logger } from '@/lib/logger';

export const metadata: Metadata = {
  title: 'Notifications',
};

export default function NotificationsPage() {
  logger.info('Notifications page accessed');

  return (
    <div>
      <h1>Notifications</h1>
      <p style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '8px', color: '#1976d2' }}>
        Notifications will be loaded in Phase 4.
      </p>
    </div>
  );
}
