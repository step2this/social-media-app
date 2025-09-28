import React, { useEffect, useState } from 'react';
import type { PublicProfile, User } from '@social-media-app/shared';
import { StoryRing } from '../layout/AppLayout';
import './ProfileDisplay.css';

interface ProfileDisplayProps {
  profile: PublicProfile | User;
  showEditButton?: boolean;
  onEditClick?: () => void;
  onAvatarClick?: () => void;
  className?: string;
}

/**
 * Format large numbers with K/M notation for display
 */
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
};

/**
 * Format date for member since display
 */
const formatMemberSince = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Hook to detect responsive breakpoints
 */
const useResponsiveLayout = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkBreakpoints = () => {
      const mobile = window.matchMedia('(max-width: 767px)').matches;
      const desktop = window.matchMedia('(min-width: 1024px)').matches;
      setIsMobile(mobile);
      setIsDesktop(desktop);
    };

    checkBreakpoints();
    window.addEventListener('resize', checkBreakpoints);
    return () => window.removeEventListener('resize', checkBreakpoints);
  }, []);

  return { isMobile, isDesktop };
};

/**
 * Shared profile display component for both public and private profiles
 * Implements wireframe specifications with three-section layout
 */
export const ProfileDisplay: React.FC<ProfileDisplayProps> = ({
  profile,
  showEditButton = false,
  onEditClick,
  onAvatarClick,
  className = ""
}) => {
  const { isMobile, isDesktop } = useResponsiveLayout();

  // Build responsive class names based on wireframe specs
  const displayClasses = [
    'profile-display',
    'profile-display--wireframe',
    isMobile && 'profile-display--mobile',
    isDesktop && 'profile-display--desktop',
    'profile-display--ascii-borders',
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      className={displayClasses}
      data-testid="profile-display"
      data-border-style="automotive-ascii"
      role="region"
      aria-label={`User profile for @${'handle' in profile ? profile.handle : profile.username}`}
    >
      {/* Avatar Section (200x200px as per wireframe) */}
      <div
        className="profile-avatar-section profile-avatar-section--wireframe"
        data-testid="profile-avatar-section"
      >
        <div className="profile-display__avatar">
          <StoryRing size="lg" hasStory={false}>
            <div
              className={`avatar-container avatar-container--wireframe ${onAvatarClick ? 'avatar-container--clickable' : ''}`}
              data-testid="profile-avatar"
              onClick={onAvatarClick}
              style={{ cursor: onAvatarClick ? 'pointer' : 'default' }}
              title={onAvatarClick ? '📷 Click to upload new pet photo' : undefined}
              tabIndex={onAvatarClick ? 0 : undefined}
              role={onAvatarClick ? 'button' : undefined}
              aria-label={onAvatarClick ? 'Upload profile picture' : undefined}
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
                    className="avatar-icon avatar-icon--wireframe"
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
      </div>

      {/* Info Section with wireframe layout */}
      <div
        className="profile-info-section profile-info-section--wireframe"
        data-testid="profile-info-section"
      >
        <div className="profile-display__info">
          <div className="profile-display__header">
            <h2
              className="profile-username profile-username--wireframe tama-heading"
              data-testid="profile-username"
              data-contrast-compliant="true"
            >
              @{'handle' in profile ? profile.handle : profile.username}
            </h2>
            {profile.fullName && (
              <p
                className="profile-fullname profile-fullname--wireframe"
                data-testid="profile-fullname"
              >
                {profile.fullName}
              </p>
            )}
          </div>

          {/* Statistics with LCD-style display (for public profiles) */}
          {'postsCount' in profile && (
            <div
              className="profile-stats profile-stats--wireframe stats-container--metallic"
              data-testid="profile-stats"
              data-automotive-finish="pearl-metallic"
              role="group"
              aria-label="Profile statistics"
            >
              <div className="stat-item stat-item--lcd" data-testid="stat-posts">
                <div
                  className="stat-number stat-number--lcd"
                  data-contrast-compliant="true"
                >
                  {formatNumber(profile.postsCount)}
                </div>
                <div className="stat-label">Posts</div>
              </div>
              <div className="stat-item stat-item--lcd" data-testid="stat-followers">
                <div
                  className="stat-number stat-number--lcd"
                  data-contrast-compliant="true"
                >
                  {formatNumber(profile.followersCount)}
                </div>
                <div className="stat-label">Followers</div>
              </div>
              <div className="stat-item stat-item--lcd" data-testid="stat-following">
                <div
                  className="stat-number stat-number--lcd"
                  data-contrast-compliant="true"
                >
                  {formatNumber(profile.followingCount)}
                </div>
                <div className="stat-label">Following</div>
              </div>
            </div>
          )}

          {/* Bio with wireframe styling */}
          {profile.bio && (
            <div
              className="profile-bio profile-bio--wireframe"
              data-testid="profile-bio"
            >
              <p className="bio-text">{profile.bio}</p>
            </div>
          )}

          {/* Member Since (for public profiles) */}
          {'createdAt' in profile && (
            <div
              className="profile-meta profile-meta--wireframe"
              data-testid="profile-member-since"
            >
              Member since {formatMemberSince(profile.createdAt)}
            </div>
          )}
        </div>
      </div>

      {/* Actions Section (for buttons and quick actions) */}
      <div
        className="profile-actions-section profile-actions-section--wireframe"
        data-testid="profile-actions-section"
      >
        {/* Edit Button with automotive styling */}
        {showEditButton && onEditClick && (
          <button
            onClick={onEditClick}
            className="tama-btn tama-btn--primary tama-btn--automotive tama-btn--racing-red profile-edit-btn"
            data-testid="profile-edit-button"
            tabIndex={0}
            aria-label="Edit profile information"
          >
            Edit Profile
          </button>
        )}
      </div>
    </div>
  );
};