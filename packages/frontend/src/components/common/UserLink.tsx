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
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showHoverCard, setShowHoverCard] = useState(false);
  const [hoverCardPosition, setHoverCardPosition] = useState({ x: 0, y: 0 });

  // Don't render if missing required data
  if (!userId || !username) {
    return null;
  }

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
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
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
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

    // Cancel any pending hide
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    // Calculate smart position for hover card
    const rect = e.currentTarget.getBoundingClientRect();
    const cardWidth = 320; // ProfileHoverCard width from CSS
    const cardHeight = 400; // Approximate card height
    const spacing = 10; // Gap between trigger and card

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate available space in each direction
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const spaceRight = viewportWidth - rect.left;
    const spaceLeft = rect.left;

    let x = rect.left;
    let y = rect.bottom + spacing;

    // Vertical positioning: prefer below, but flip to above if not enough space
    if (spaceBelow < cardHeight && spaceAbove > spaceBelow) {
      // Position above
      y = rect.top - cardHeight - spacing;
    }

    // Horizontal positioning: keep within viewport
    if (x + cardWidth > viewportWidth) {
      // Align to right edge of viewport with padding
      x = viewportWidth - cardWidth - 20;
    }

    // Ensure card doesn't go off left edge
    if (x < 20) {
      x = 20;
    }

    setHoverCardPosition({ x, y });

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
    // Cancel pending hover card show
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    // Delay hiding to allow mouse to reach the hover card
    // 200ms gives enough time to move mouse from link to card
    hideTimeoutRef.current = setTimeout(() => {
      setShowHoverCard(false);

      // Call external callback if provided
      if (onHoverEnd) {
        onHoverEnd(userId);
      }
    }, 200);
  };

  const handleHoverCardMouseEnter = () => {
    // Keep hover card visible when mouse enters it
    // Cancel any pending show timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // Cancel any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const handleHoverCardMouseLeave = () => {
    // Hide immediately when leaving hover card
    setShowHoverCard(false);

    // Call external callback if provided
    if (onHoverEnd) {
      onHoverEnd(userId);
    }
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
