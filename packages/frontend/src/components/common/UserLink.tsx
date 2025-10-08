import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ProfileHoverCard } from './ProfileHoverCard.js';
import './UserLink.css';

interface UserLinkProps {
  userId: string;
  username: string;
  handle?: string;
  fullName?: string;
  showAt?: boolean;
  showFullName?: boolean;
  className?: string;
  compact?: boolean;
  external?: boolean;
  disableHover?: boolean;
  onClick?: (userId: string) => boolean | void;
  onHoverStart?: (userId: string) => void;
  onHoverEnd?: (userId: string) => void;
}

/**
 * UserLink component for rendering clickable user names/handles
 * Supports hover cards and profile navigation
 */
export const UserLink = ({
  userId,
  username,
  handle,
  fullName,
  showAt = true,
  showFullName = false,
  className = '',
  compact = false,
  external = false,
  disableHover = false,
  onClick,
  onHoverStart,
  onHoverEnd
}: UserLinkProps) => {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showHoverCard, setShowHoverCard] = useState(false);
  const [hoverCardPosition, setHoverCardPosition] = useState({ x: 0, y: 0 });

  // Don't render if missing required data
  if (!userId || !username) {
    return null;
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const displayName = showFullName && fullName ? fullName : username;
  const displayText = showAt && !showFullName ? `@${displayName}` : displayName;
  const profileHandle = handle || username;
  const profileUrl = `/profile/${profileHandle}`;

  const classes = [
    'user-link',
    'user-link--hoverable',
    'user-link--responsive',
    compact && 'user-link--compact',
    className
  ].filter(Boolean).join(' ');

  const ariaLabel = showFullName && fullName
    ? `View profile of ${fullName}`
    : `View profile of @${username}`;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Hide hover card on click
    setShowHoverCard(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    if (onClick) {
      const result = onClick(userId);
      if (result === false) {
        e.preventDefault();
      }
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (disableHover) return;

    // Calculate position for hover card
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverCardPosition({
      x: rect.left,
      y: rect.bottom + 10 // 10px below the link
    });

    // Show hover card after 500ms delay
    hoverTimeoutRef.current = setTimeout(() => {
      setShowHoverCard(true);
    }, 500);

    // Call external callback if provided
    if (onHoverStart) {
      onHoverStart(userId);
    }
  };

  const handleMouseLeave = () => {
    // Cancel pending hover card
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    // Hide hover card immediately
    setShowHoverCard(false);

    // Call external callback if provided
    if (onHoverEnd) {
      onHoverEnd(userId);
    }
  };

  const handleHoverCardMouseEnter = () => {
    // Keep hover card visible when mouse enters it
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleHoverCardMouseLeave = () => {
    // Hide when leaving hover card
    setShowHoverCard(false);
  };

  const handleHoverCardClose = () => {
    setShowHoverCard(false);
  };

  const linkProps = {
    ref: linkRef,
    className: classes,
    'aria-label': ariaLabel,
    'data-testid': 'user-link',
    'data-user-id': userId,
    tabIndex: 0,
    onClick: handleClick,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    ...(external && {
      target: '_blank',
      rel: 'noopener noreferrer'
    })
  };

  return (
    <>
      <Link to={profileUrl} {...linkProps}>
        {displayText}
      </Link>

      {!disableHover && (
        <ProfileHoverCard
          userId={userId}
          userHandle={profileHandle}
          isVisible={showHoverCard}
          position={hoverCardPosition}
          onMouseEnter={handleHoverCardMouseEnter}
          onMouseLeave={handleHoverCardMouseLeave}
          onClose={handleHoverCardClose}
        />
      )}
    </>
  );
};
