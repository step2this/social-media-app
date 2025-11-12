import { Metadata } from 'next';

type Props = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  return {
    title: `@${handle}`,
    description: `Profile page for @${handle}`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const { handle } = await params;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="cover-photo">
          {/* Cover photo placeholder */}
        </div>
        <div className="profile-info">
          <div className="avatar-large">👤</div>
          <div className="profile-details">
            <h1>Username</h1>
            <p className="handle">@{handle}</p>
            <p className="bio">This is a placeholder profile. Real profile data will be fetched from GraphQL in Phase 4.</p>
            <div className="stats">
              <div className="stat">
                <strong>0</strong>
                <span>Posts</span>
              </div>
              <div className="stat">
                <strong>0</strong>
                <span>Followers</span>
              </div>
              <div className="stat">
                <strong>0</strong>
                <span>Following</span>
              </div>
            </div>
          </div>
          <div className="profile-actions">
            <button className="follow-button">Follow</button>
          </div>
        </div>
      </div>

      <div className="profile-content">
        <div className="tabs">
          <div className="tab active">Posts</div>
          <div className="tab">Replies</div>
          <div className="tab">Media</div>
          <div className="tab">Likes</div>
        </div>
        <p className="info-text">Posts will appear here in Phase 4</p>
      </div>

      <style jsx>{`
        .profile-page {
          max-width: 800px;
          margin: 0 auto;
        }
        .profile-header {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 1rem;
        }
        .cover-photo {
          height: 200px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .profile-info {
          padding: 1rem;
          position: relative;
        }
        .avatar-large {
          width: 120px;
          height: 120px;
          background: #e0e0e0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 4rem;
          border: 4px solid white;
          margin-top: -60px;
          margin-bottom: 1rem;
        }
        .profile-details h1 {
          margin: 0 0 0.25rem 0;
          color: var(--text-primary);
        }
        .handle {
          color: var(--text-secondary);
          margin: 0 0 0.5rem 0;
        }
        .bio {
          color: var(--text-primary);
          line-height: 1.5;
          margin-bottom: 1rem;
        }
        .stats {
          display: flex;
          gap: 2rem;
        }
        .stat {
          display: flex;
          flex-direction: column;
        }
        .stat strong {
          font-size: 1.25rem;
          color: var(--text-primary);
        }
        .stat span {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }
        .profile-actions {
          position: absolute;
          top: 1rem;
          right: 1rem;
        }
        .follow-button {
          padding: 0.5rem 1.5rem;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 20px;
          font-weight: 600;
          cursor: pointer;
          opacity: 0.5;
        }
        .profile-content {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1rem;
        }
        .tabs {
          display: flex;
          gap: 1rem;
          border-bottom: 1px solid #e0e0e0;
          margin-bottom: 1rem;
        }
        .tab {
          padding: 0.75rem 1rem;
          cursor: pointer;
          color: var(--text-secondary);
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
        }
        .tab.active {
          color: var(--primary-color);
          border-bottom-color: var(--primary-color);
        }
        .info-text {
          color: var(--text-secondary);
          text-align: center;
          padding: 2rem;
        }
      `}</style>
    </div>
  );
}
