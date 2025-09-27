import React from 'react';

interface RightPanelProps {
  className?: string;
}

/**
 * Right panel component following wireframe specifications
 * - 320px width on desktop
 * - Hidden on tablet and mobile
 * - Contains suggested users, trending tags, and activity feed
 */
export const RightPanel: React.FC<RightPanelProps> = ({ className = '' }) => {
  // Mock data for development - will be replaced with real API calls
  const suggestedUsers = [
    { id: '1', username: 'petlover123', fullName: 'Pet Lover', avatar: '🐱' },
    { id: '2', username: 'tamafriend', fullName: 'Tama Friend', avatar: '🐶' },
    { id: '3', username: 'virtualvet', fullName: 'Virtual Vet', avatar: '👩‍⚕️' },
  ];

  const trendingTags = [
    { tag: '#VirtualPets', posts: 1200 },
    { tag: '#TamaFriends', posts: 890 },
    { tag: '#PetCare', posts: 567 },
    { tag: '#DigitalPets', posts: 234 },
  ];

  const recentActivity = [
    { id: '1', user: 'petlover123', action: 'liked your post', time: '2m' },
    { id: '2', user: 'tamafriend', action: 'started following you', time: '5m' },
    { id: '3', user: 'virtualvet', action: 'commented on your post', time: '10m' },
  ];

  return (
    <aside className={`right-panel right-panel--automotive ${className}`} role="complementary" aria-label="Sidebar content">
      {/* Suggested Users */}
      <div className="panel-section suggested-users">
        <h3 className="panel-heading">🐾 Suggested Pet Friends</h3>
        <div className="suggested-users-list">
          {suggestedUsers.map((user) => (
            <div key={user.id} className="suggested-user">
              <div className="suggested-user-avatar">
                <span className="user-avatar-emoji" aria-hidden="true">
                  {user.avatar}
                </span>
              </div>
              <div className="suggested-user-info">
                <div className="suggested-user-name">{user.fullName}</div>
                <div className="suggested-user-handle">@{user.username}</div>
              </div>
              <button className="follow-btn tama-btn tama-btn--secondary">
                Follow
              </button>
            </div>
          ))}
        </div>
        <button className="see-all-btn tama-link">See all suggestions</button>
      </div>

      {/* Trending Tags */}
      <div className="panel-section trending-tags">
        <h3 className="panel-heading">📈 Trending in Pet World</h3>
        <div className="trending-list">
          {trendingTags.map((trend) => (
            <div key={trend.tag} className="trending-item">
              <div className="trending-tag">{trend.tag}</div>
              <div className="trending-count">
                {trend.posts.toLocaleString()} posts
              </div>
            </div>
          ))}
        </div>
        <button className="see-all-btn tama-link">Show more trends</button>
      </div>

      {/* Activity Feed */}
      <div className="panel-section activity-feed">
        <h3 className="panel-heading">🔔 Recent Activity</h3>
        <div className="activity-list">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="activity-item">
              <div className="activity-text">
                <span className="activity-user">@{activity.user}</span>
                <span className="activity-action">{activity.action}</span>
              </div>
              <div className="activity-time">{activity.time}</div>
            </div>
          ))}
        </div>
        <button className="see-all-btn tama-link">View all activity</button>
      </div>

      {/* TamaFriends Promotional Section */}
      <div className="panel-section promo-section">
        <div className="promo-card">
          <h4 className="promo-title">🎮 Level Up Your Pet!</h4>
          <p className="promo-text">
            Unlock new features and accessories for your virtual pets.
          </p>
          <button className="promo-btn tama-btn tama-btn--premium-metallic">
            Explore Premium
          </button>
        </div>
      </div>
    </aside>
  );
};