import React from 'react';
import type { PublicProfile, UserProfile } from '@social-media-app/shared';
import { StoryRing } from '../layout/AppLayout';
import './ProfileDisplay.css';

interface ProfileDisplayProps {
  profile: PublicProfile | UserProfile;
  showEditButton?: boolean;
  onEditClick?: () => void;
  className?: string;
}

/**
 * Shared profile display component for both public and private profiles
 */
export const ProfileDisplay: React.FC<ProfileDisplayProps> = ({
  profile,
  showEditButton = false,
  onEditClick,
  className = ""
}) => {
  return (
    <div className={`profile-display ${className}`}>
      {/* Profile Picture */}
      <div className="profile-display__avatar">
        <StoryRing size="lg" hasStory={false}>
          <div
            className="avatar-container"
            data-testid="profile-avatar"
          >
            {profile.profilePictureThumbnailUrl ? (
              <img
                src={profile.profilePictureThumbnailUrl}
                alt="Profile picture"
                className="avatar-image"
              />
            ) : (
              <div className="avatar-placeholder">
                <svg
                  className="avatar-icon"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            )}
          </div>
        </StoryRing>
      </div>

      {/* Profile Info */}
      <div className="profile-display__info">
        <div className="profile-display__header">
          <h2 className="profile-username neon-text">
            @{'handle' in profile ? profile.handle : profile.username}
          </h2>
          {profile.fullName && (
            <p className="profile-fullname">{profile.fullName}</p>
          )}
        </div>

        {/* Stats (for public profiles) */}
        {'postsCount' in profile && (
          <div className="profile-stats">
            <div className="stat-item">
              <div className="stat-number">{profile.postsCount}</div>
              <div className="stat-label">Posts</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{profile.followersCount}</div>
              <div className="stat-label">Followers</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{profile.followingCount}</div>
              <div className="stat-label">Following</div>
            </div>
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <div className="profile-bio">
            <p className="bio-text">{profile.bio}</p>
          </div>
        )}

        {/* Member Since (for public profiles) */}
        {'createdAt' in profile && (
          <div className="profile-meta">
            Member since {new Date(profile.createdAt).toLocaleDateString()}
          </div>
        )}

        {/* Edit Button */}
        {showEditButton && onEditClick && (
          <button
            onClick={onEditClick}
            className="btn btn-retro profile-edit-btn"
          >
            Edit Profile
          </button>
        )}
      </div>
    </div>
  );
};