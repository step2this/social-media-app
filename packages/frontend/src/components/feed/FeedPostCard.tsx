import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { PostGridItem } from '@social-media-app/shared';
import { UserLink } from '../common/UserLink';
import './FeedPostCard.css';

interface FeedPostCardProps {
  post: PostGridItem;
}

/**
 * Instagram-style feed post card component
 * Displays post with author info, image, caption, and engagement stats
 */
export const FeedPostCard: React.FC<FeedPostCardProps> = ({ post }) => {
  const navigate = useNavigate();

  const handlePostClick = () => {
    navigate(`/post/${post.id}`);
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handlePostClick();
  };

  return (
    <article className="feed-post-card">
      {/* Post Header - Author Info */}
      <header className="feed-post-card__header">
        <div className="feed-post-card__author">
          <UserLink
            userId={post.authorId}
            handle={post.authorHandle}
            displayName={post.authorFullName}
            avatarUrl={post.authorProfilePictureUrl}
            showAvatar={true}
            className="feed-post-card__author-link"
          />
          <span className="feed-post-card__author-name">
            {post.authorHandle}
          </span>
        </div>
        <button className="feed-post-card__menu-btn" aria-label="More options">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
            <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
          </svg>
        </button>
      </header>

      {/* Post Image */}
      <div className="feed-post-card__image-container" onClick={handleImageClick}>
        <img
          src={post.imageUrl}
          alt={post.caption || 'Post image'}
          className="feed-post-card__image"
          loading="lazy"
        />
      </div>

      {/* Post Actions */}
      <div className="feed-post-card__actions">
        <div className="feed-post-card__actions-left">
          <button className="feed-post-card__action-btn" aria-label="Like post">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
          <button className="feed-post-card__action-btn" aria-label="Comment on post">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
          </button>
          <button className="feed-post-card__action-btn" aria-label="Share post">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <button className="feed-post-card__action-btn" aria-label="Save post">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      </div>

      {/* Post Info */}
      <div className="feed-post-card__info">
        {/* Likes Count */}
        {post.likesCount > 0 && (
          <div className="feed-post-card__likes">
            <strong>{post.likesCount}</strong> {post.likesCount === 1 ? 'like' : 'likes'}
          </div>
        )}

        {/* Caption */}
        {post.caption && (
          <div className="feed-post-card__caption">
            <strong className="feed-post-card__caption-author">
              {post.authorHandle}
            </strong>{' '}
            <span className="feed-post-card__caption-text">{post.caption}</span>
          </div>
        )}

        {/* View Post Link */}
        <button
          onClick={handlePostClick}
          className="feed-post-card__view-post"
        >
          View post details
        </button>
      </div>
    </article>
  );
};
