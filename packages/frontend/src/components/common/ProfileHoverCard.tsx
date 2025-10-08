import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { profileService } from '../../services/profileService.js';
import { FollowButton } from './FollowButton.js';
import { useAuth } from '../../hooks/useAuth.js';
import type { PublicProfile } from '@social-media-app/shared';
import './ProfileHoverCard.css';

interface ProfileHoverCardProps {
  userId: string;
  isVisible: boolean;
  position: { x: number; y: number };
  offset?: { x: number; y: number };
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClose?: () => void;
}

/**
 * ProfileHoverCard component for Instagram-style profile previews
 * Shows profile information with follow button on hover
 */
export const ProfileHoverCard = ({
  userId,
  isVisible,
  position,
  offset = { x: 0, y: 0 },
  onMouseEnter,
  onMouseLeave,
  onClose
}: ProfileHoverCardProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Don't render if not visible or no userId
  if (!isVisible || !userId) {
    return null;
  }

  const isCurrentUser = user?.id === userId;

  // Fetch profile data when visible and userId changes
  useEffect(() => {
    if (!isVisible || !userId) return;

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await profileService.getPublicProfile(userId);
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isVisible, userId]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isVisible) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isVisible, onClose]);

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  const cardStyles = {
    left: `${position.x + offset.x}px`,
    top: `${position.y + offset.y}px`
  };

  // Loading state
  if (loading) {
    return createPortal(
      <div
        className="profile-hover-card profile-hover-card--shadow"
        style={cardStyles}
        data-testid="profile-hover-card-loading"
        role="dialog"
        aria-label="Loading profile"
      >
        <div className="profile-hover-card__loading">
          <div className="spinner" />
          <p>Loading...</p>
        </div>
      </div>,
      document.body
    );
  }

  // Error state
  if (error) {
    return createPortal(
      <div
        className="profile-hover-card profile-hover-card--shadow"
        style={cardStyles}
        data-testid="profile-hover-card"
        role="dialog"
        aria-label="Profile error"
      >
        <div className="profile-hover-card__error">
          <p>{error}</p>
        </div>
      </div>,
      document.body
    );
  }

  // No profile data
  if (!profile) {
    return null;
  }

  // Truncate bio to 120 characters
  const truncatedBio = profile.bio && profile.bio.length > 120
    ? `${profile.bio.substring(0, 120)}...`
    : profile.bio;

  const cardContent = (
    <div
      className="profile-hover-card profile-hover-card--shadow"
      style={cardStyles}
      data-testid="profile-hover-card"
      role="dialog"
      aria-label={`Profile preview for ${profile.fullName || profile.username}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header with Avatar and Basic Info */}
      <div className="profile-hover-card__header">
        {profile.profilePictureThumbnailUrl || profile.profilePictureUrl ? (
          <img
            src={profile.profilePictureThumbnailUrl || profile.profilePictureUrl}
            alt={profile.fullName || profile.username}
            className="profile-hover-card__avatar"
          />
        ) : (
          <div className="profile-hover-card__avatar profile-hover-card__avatar--placeholder">
            <span className="material-icon">person</span>
          </div>
        )}

        <div className="profile-hover-card__info">
          {profile.fullName && (
            <div className="profile-hover-card__name">{profile.fullName}</div>
          )}
          <div className="profile-hover-card__handle">@{profile.username}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="profile-hover-card__stats">
        <div className="profile-hover-card__stat">
          <span className="profile-hover-card__stat-value">{profile.postsCount}</span>
          <span className="profile-hover-card__stat-label">Posts</span>
        </div>
        <div className="profile-hover-card__stat">
          <span className="profile-hover-card__stat-value">{profile.followersCount}</span>
          <span className="profile-hover-card__stat-label">Followers</span>
        </div>
        <div className="profile-hover-card__stat">
          <span className="profile-hover-card__stat-value">{profile.followingCount}</span>
          <span className="profile-hover-card__stat-label">Following</span>
        </div>
      </div>

      {/* Bio */}
      {truncatedBio && (
        <div className="profile-hover-card__bio" data-testid="profile-bio">
          {truncatedBio}
        </div>
      )}

      {/* Follow Button and View Profile Link */}
      <div className="profile-hover-card__actions">
        {!isCurrentUser && (
          <div data-user-id={userId}>
            <FollowButton
              userId={userId}
              initialIsFollowing={false}
              initialFollowersCount={profile.followersCount}
            />
          </div>
        )}

        <Link
          to={`/profile/${profile.handle || profile.username}`}
          className="profile-hover-card__view-profile"
          onClick={handleLinkClick}
        >
          View Profile
        </Link>
      </div>
    </div>
  );

  return createPortal(cardContent, document.body);
};
