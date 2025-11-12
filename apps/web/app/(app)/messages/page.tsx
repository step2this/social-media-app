import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Messages',
  description: 'Your direct messages',
};

export default function MessagesPage() {
  return (
    <div className="messages-page">
      <h1>Messages</h1>
      <p className="info-text">
        Direct messaging will be implemented in a future phase.
      </p>

      <div className="messages-placeholder">
        <div className="placeholder-icon">💬</div>
        <h2>Coming Soon</h2>
        <p>Direct messaging functionality will be added in a future update.</p>
      </div>

      <style jsx>{`
        .messages-page {
          max-width: 800px;
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
        .messages-placeholder {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 4rem 2rem;
          text-align: center;
        }
        .placeholder-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        .messages-placeholder h2 {
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }
        .messages-placeholder p {
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
