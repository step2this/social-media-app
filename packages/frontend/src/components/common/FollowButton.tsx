import { useState } from 'react';
import { useFollow, type UseFollowOptions } from '../../hooks/useFollow.js';
import { useAuth } from '../../hooks/useAuth.js';
import './FollowButton.css';

interface FollowButtonProps {
  userId: string;
  initialIsFollowing?: boolean;
  initialFollowersCount?: number;
  initialFollowingCount?: number;
  onFollowStatusChange?: () => void | Promise<void>;
}

/**
 * FollowButton component with optimistic updates and hover states
 * Follows Instagram-style interaction patterns
 */
export const FollowButton = ({
  userId,
  initialIsFollowing,
  initialFollowersCount,
  initialFollowingCount,
  onFollowStatusChange
}: FollowButtonProps) => {
  const { user, isAuthenticated } = useAuth();
  const [isHovering, setIsHovering] = useState(false);

  const options: UseFollowOptions = {
    initialIsFollowing,
    initialFollowersCount,
    initialFollowingCount,
    onFollowStatusChange
  };

  const {
    isFollowing,
    isLoading,
    error,
    followUser,
    unfollowUser,
    clearError
  } = useFollow(userId, options);

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
