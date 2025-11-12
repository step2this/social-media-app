import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your account settings',
};

export default function SettingsPage() {
  return (
    <div className="settings-page">
      <h1>Settings</h1>
      <p className="info-text">
        Settings functionality will be implemented in a future phase.
      </p>

      <div className="settings-sections">
        <div className="settings-section">
          <h2>Account</h2>
          <div className="setting-item">
            <span>Username</span>
            <span className="setting-value">@username</span>
          </div>
          <div className="setting-item">
            <span>Email</span>
            <span className="setting-value">user@example.com</span>
          </div>
          <div className="setting-item">
            <span>Password</span>
            <button disabled>Change Password</button>
          </div>
        </div>

        <div className="settings-section">
          <h2>Privacy</h2>
          <div className="setting-item">
            <span>Private Account</span>
            <input type="checkbox" disabled />
          </div>
          <div className="setting-item">
            <span>Show Activity Status</span>
            <input type="checkbox" disabled defaultChecked />
          </div>
        </div>

        <div className="settings-section">
          <h2>Notifications</h2>
          <div className="setting-item">
            <span>Email Notifications</span>
            <input type="checkbox" disabled defaultChecked />
          </div>
          <div className="setting-item">
            <span>Push Notifications</span>
            <input type="checkbox" disabled defaultChecked />
          </div>
        </div>
      </div>

      <style jsx>{`
        .settings-page {
          max-width: 700px;
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
        .settings-sections {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .settings-section {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.5rem;
        }
        .settings-section h2 {
          margin: 0 0 1rem 0;
          color: var(--text-primary);
          font-size: 1.25rem;
        }
        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .setting-item:last-child {
          border-bottom: none;
        }
        .setting-item span:first-child {
          color: var(--text-primary);
          font-weight: 500;
        }
        .setting-value {
          color: var(--text-secondary);
        }
        .setting-item button {
          padding: 0.5rem 1rem;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          cursor: pointer;
        }
        .setting-item button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .setting-item input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
        }
        .setting-item input[type="checkbox"]:disabled {
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
