import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore',
  description: 'Discover new content and users',
};

export default function ExplorePage() {
  return (
    <div className="explore-page">
      <h1>Explore</h1>
      <p className="info-text">
        Discover trending posts and new users. Content will be loaded from GraphQL in Phase 4.
      </p>

      <div className="explore-grid">
        <div className="explore-card">
          <div className="card-icon">🔥</div>
          <h3>Trending</h3>
          <p>Hot topics and popular posts</p>
        </div>
        <div className="explore-card">
          <div className="card-icon">👥</div>
          <h3>Suggested Users</h3>
          <p>People you might want to follow</p>
        </div>
        <div className="explore-card">
          <div className="card-icon">🏷️</div>
          <h3>Tags</h3>
          <p>Browse posts by topic</p>
        </div>
        <div className="explore-card">
          <div className="card-icon">📸</div>
          <h3>Media</h3>
          <p>Photos and videos</p>
        </div>
      </div>

      <style jsx>{`
        .explore-page {
          max-width: 900px;
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
        .explore-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }
        .explore-card {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.5rem;
          text-align: center;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .explore-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .card-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .explore-card h3 {
          margin: 0 0 0.5rem 0;
          color: var(--text-primary);
        }
        .explore-card p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}
