import { Metadata } from 'next';

type Props = {
  params: Promise<{ postId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { postId } = await params;
  return {
    title: `Post ${postId}`,
    description: 'View post details and comments',
  };
}

export default async function PostDetailPage({ params }: Props) {
  const { postId } = await params;

  return (
    <div className="post-detail-page">
      <div className="post-detail">
        <div className="post-header">
          <div className="avatar-placeholder">👤</div>
          <div className="post-meta">
            <strong>Username</strong>
            <span className="handle">@username</span>
          </div>
        </div>
        <div className="post-content">
          <p>This is post {postId}. Full post details will be loaded from GraphQL in Phase 4.</p>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
        </div>
        <div className="post-stats">
          <span>2:30 PM · Jan 15, 2025</span>
          <span>•</span>
          <span><strong>42</strong> Likes</span>
          <span>•</span>
          <span><strong>7</strong> Comments</span>
        </div>
        <div className="post-actions">
          <button>❤️ Like</button>
          <button>💬 Comment</button>
          <button>🔄 Share</button>
        </div>
      </div>

      <div className="comments-section">
        <h3>Comments</h3>
        <div className="comment">
          <div className="avatar-small">👤</div>
          <div className="comment-content">
            <div className="comment-header">
              <strong>User1</strong>
              <span className="handle">@user1</span>
            </div>
            <p>Great post! Comments will be loaded from GraphQL in Phase 4.</p>
          </div>
        </div>
        <div className="comment">
          <div className="avatar-small">👤</div>
          <div className="comment-content">
            <div className="comment-header">
              <strong>User2</strong>
              <span className="handle">@user2</span>
            </div>
            <p>Agreed! Looking forward to the full implementation.</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .post-detail-page {
          max-width: 600px;
          margin: 0 auto;
        }
        .post-detail {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1rem;
        }
        .post-header {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .avatar-placeholder {
          width: 48px;
          height: 48px;
          background: #e0e0e0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }
        .avatar-small {
          width: 36px;
          height: 36px;
          background: #e0e0e0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .post-meta {
          display: flex;
          flex-direction: column;
        }
        .post-meta strong {
          color: var(--text-primary);
        }
        .handle {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-left: 0.5rem;
        }
        .post-content {
          margin-bottom: 1rem;
          color: var(--text-primary);
          line-height: 1.6;
        }
        .post-content p {
          margin: 0.5rem 0;
        }
        .post-stats {
          display: flex;
          gap: 0.5rem;
          padding: 0.75rem 0;
          border-top: 1px solid #f0f0f0;
          border-bottom: 1px solid #f0f0f0;
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-bottom: 0.75rem;
        }
        .post-actions {
          display: flex;
          gap: 1rem;
        }
        .post-actions button {
          flex: 1;
          padding: 0.75rem;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .post-actions button:hover {
          background: #f5f5f5;
        }
        .comments-section {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.5rem;
        }
        .comments-section h3 {
          margin: 0 0 1rem 0;
          color: var(--text-primary);
        }
        .comment {
          display: flex;
          gap: 0.75rem;
          padding: 1rem 0;
          border-top: 1px solid #f0f0f0;
        }
        .comment:first-of-type {
          border-top: none;
        }
        .comment-content {
          flex: 1;
        }
        .comment-header {
          margin-bottom: 0.25rem;
        }
        .comment-header strong {
          color: var(--text-primary);
        }
        .comment-content p {
          margin: 0;
          color: var(--text-primary);
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
