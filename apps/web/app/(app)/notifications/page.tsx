import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notifications',
  description: 'Stay updated with your notifications',
};

export default function NotificationsPage() {
  return (
    <div className="notifications-page">
      <h1>Notifications</h1>
      <p className="info-text">
        Notifications will be loaded from GraphQL in Phase 4.
      </p>

      <div className="notifications-list">
        <div className="notification">
          <div className="notification-icon">❤️</div>
          <div className="notification-content">
            <p><strong>user1</strong> liked your post</p>
            <span className="time">2 hours ago</span>
          </div>
        </div>
        <div className="notification">
          <div className="notification-icon">💬</div>
          <div className="notification-content">
            <p><strong>user2</strong> commented on your post</p>
            <span className="time">5 hours ago</span>
          </div>
        </div>
        <div className="notification">
          <div className="notification-icon">👥</div>
          <div className="notification-content">
            <p><strong>user3</strong> started following you</p>
            <span className="time">1 day ago</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .notifications-page {
          max-width: 600px;
          margin: 0 auto;
        }
        h1 {
          margin-bottom: 1rem;
          color: var(--text-primary);
        }
        .info-text {
          background: #e3f2fd;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 2rem;
          color: #1976d2;
          font-size: 0.9rem;
        }
        .notifications-list {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
        }
        .notification {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          border-bottom: 1px solid #f0f0f0;
          cursor: pointer;
          transition: background 0.2s;
        }
        .notification:last-child {
          border-bottom: none;
        }
        .notification:hover {
          background: #f5f5f5;
        }
        .notification-icon {
          width: 48px;
          height: 48px;
          background: #e3f2fd;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        .notification-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .notification-content p {
          margin: 0 0 0.25rem 0;
          color: var(--text-primary);
        }
        .notification-content strong {
          font-weight: 600;
        }
        .time {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}
