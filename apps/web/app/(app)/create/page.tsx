import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Post',
  description: 'Share your thoughts',
};

export default function CreatePostPage() {
  return (
    <div className="create-page">
      <h1>Create Post</h1>
      <p className="info-text">
        Create post form will be implemented in Phase 3 with Server Actions in Phase 4.
      </p>

      <div className="create-form">
        <div className="form-header">
          <div className="avatar-placeholder">👤</div>
          <div className="user-info">
            <strong>Your Name</strong>
          </div>
        </div>
        <div className="form-body">
          <textarea
            className="post-input"
            placeholder="What's on your mind?"
            rows={6}
            disabled
          />
        </div>
        <div className="form-footer">
          <div className="media-options">
            <button disabled>📷 Photo</button>
            <button disabled>🎥 Video</button>
            <button disabled>😊 Emoji</button>
          </div>
          <button className="post-button" disabled>Post</button>
        </div>
      </div>

      <style jsx>{`
        .create-page {
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
        .create-form {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.5rem;
        }
        .form-header {
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
        .user-info strong {
          color: var(--text-primary);
        }
        .form-body {
          margin-bottom: 1rem;
        }
        .post-input {
          width: 100%;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1rem;
          font-size: 1rem;
          font-family: inherit;
          resize: vertical;
          color: var(--text-primary);
        }
        .post-input:focus {
          outline: none;
          border-color: var(--primary-color);
        }
        .post-input:disabled {
          background: #fafafa;
          cursor: not-allowed;
        }
        .form-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .media-options {
          display: flex;
          gap: 0.5rem;
        }
        .media-options button {
          padding: 0.5rem 1rem;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
        }
        .media-options button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .post-button {
          padding: 0.75rem 2rem;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 20px;
          font-weight: 600;
          cursor: pointer;
        }
        .post-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
