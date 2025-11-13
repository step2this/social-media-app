import { Profile } from '@/lib/graphql/types';
import FollowButton from './FollowButton';

interface ProfileHeaderProps {
  profile: Profile;
  isOwnProfile: boolean;
  isFollowing?: boolean;
}

export default function ProfileHeader({ profile, isOwnProfile, isFollowing = false }: ProfileHeaderProps) {
  return (
    <div style={{ borderBottom: '1px solid #e0e0e0', paddingBottom: '2rem' }}>
      {/* Profile Picture and Stats */}
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem' }}>
        {/* Profile Picture */}
        <div>
          {profile.profilePictureUrl ? (
            <img
              src={profile.profilePictureUrl}
              alt={profile.fullName || profile.username}
              style={{
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                backgroundColor: '#e0e0e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '3rem',
                color: '#666',
                fontWeight: 'bold',
              }}
            >
              {profile.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Username and Stats */}
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: '1rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {profile.username}
            </h1>
            <p style={{ color: '#666', marginBottom: '1rem' }}>@{profile.handle}</p>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
              <div>
                <strong>{profile.postsCount}</strong> posts
              </div>
              <div>
                <strong>{profile.followersCount}</strong> followers
              </div>
              <div>
                <strong>{profile.followingCount}</strong> following
              </div>
            </div>

            {/* Action Buttons */}
            {isOwnProfile ? (
              <a
                href="/settings"
                style={{
                  display: 'inline-block',
                  padding: '0.5rem 1.5rem',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #dbdbdb',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  color: '#262626',
                  fontWeight: 600,
                }}
              >
                Edit Profile
              </a>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <FollowButton
                  userId={profile.id}
                  initialIsFollowing={isFollowing}
                  initialFollowersCount={profile.followersCount}
                />
                <button
                  style={{
                    padding: '0.5rem 1.5rem',
                    backgroundColor: '#f5f5f5',
                    border: '1px solid #dbdbdb',
                    borderRadius: '4px',
                    fontWeight: 600,
                    cursor: 'not-allowed',
                    opacity: 0.6,
                  }}
                  disabled
                >
                  Message
                </button>
              </div>
            )}
          </div>

          {/* Bio */}
          {(profile.fullName || profile.bio) && (
            <div>
              {profile.fullName && (
                <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{profile.fullName}</p>
              )}
              {profile.bio && <p style={{ color: '#262626' }}>{profile.bio}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
