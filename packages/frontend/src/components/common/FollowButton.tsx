import { useState } from 'react';
import { useFollow } from '../../hooks/useFollow.js';
import { useAuth } from '../../hooks/useAuth.js';
import './FollowButton.css';

interface FollowButtonProps {
  userId: string;
  isFollowing: boolean;  // Now required - passed from parent query
  onFollowStatusChange?: () => void | Promise<void>;
}

/**
 * FollowButton component with optimistic updates and hover states
 *
 * This component reads follow state from parent props (ProfilePage query data),
 * not from local state. The useFollow hook only provides mutation functions.
 *
 * Relay automatically updates the parent query when mutations complete,
 * triggering a re-render with new isFollowing state.
 */
export const FollowButton = ({
  userId,
  isFollowing,
  onFollowStatusChange: _onFollowStatusChange
}: FollowButtonProps) => {
  const { user, isAuthenticated } = useAuth();
  const [isHovering, setIsHovering] = useState(false);

  // Hook provides mutation functions only
  const {
    followUser,
    unfollowUser,
    isLoading,
    error,
    clearError
  } = useFollow(userId);

  // Don't show button for current user or if not authenticated
  if (!isAuthenticated || user?.id === userId) {
    return null;
  }

  const handleClick = async () => {
    // Clear any previous errors
    if (error) {
      clearError();
    }

    if (isFollowing) {
      await unfollowUser();
    } else {
      await followUser();
    }
  };

  const getButtonText = () => {
    if (isLoading) return '';
    if (isFollowing && isHovering) return 'Unfollow';
    if (isFollowing) return 'Following';
    return 'Follow';
  };

  const getButtonClasses = () => {
    const baseClasses = 'tama-btn tama-btn--automotive follow-button';
    if (isFollowing) {
      return `${baseClasses} tama-btn--secondary follow-button--following`;
    }
    return baseClasses;
  };

  return (
    <div className="follow-button-container">
      <button
        type="button"
        className={getButtonClasses()}
        onClick={handleClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        disabled={isLoading}
        aria-label={isFollowing ? 'Unfollow user' : 'Follow user'}
        data-testid="follow-button"
      >
        {isLoading && (
          <span className="spinner" data-testid="follow-button-spinner" />
        )}
        {getButtonText()}
      </button>
      {error && (
        <div className="follow-button-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};
