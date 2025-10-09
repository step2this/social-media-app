import React, { useState } from 'react';
import type { Post, FeedPostItem } from '@social-media-app/shared';
import { MaterialIcon } from '../common/MaterialIcon';
import { useLike } from '../../hooks/useLike';
import { UserLink } from '../common/UserLink';
import { FollowButton } from '../common/FollowButton';
import './PostCard.css';

export interface PostCardProps {
  post: Post | FeedPostItem;
  currentUserId?: string;
  showComments?: boolean;
  compact?: boolean;
  variant?: 'feed' | 'detail';
}

/**
 * Reusable post card component
 * Displays post with image, caption, tags, and interaction buttons
 * Consistent UI across feed and post detail pages
 * @param variant - Layout variant: 'feed' (square images, compact) or 'detail' (full images, expanded)
 */
export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  showComments = false,
  compact = false,
  variant = 'feed'
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  // Initialize like hook with post data
  const {
    isLiked,
    likesCount,
    isLoading: likeLoading,
    toggleLike
  } = useLike(post.id, {
    initialIsLiked: post.isLiked || false,
    initialLikesCount: post.likesCount || 0
  });

  // Determine if this is the current user's post
  const isOwnPost = currentUserId && currentUserId === post.userId;

  // Build class names based on props
  const cardClasses = [
    'post-card',
    compact && 'post-card--compact',
    variant === 'detail' && 'post-card--detail'
  ].filter(Boolean).join(' ');

  return (
    <article className={cardClasses} data-testid="post-card">
      {/* Post Image */}
      <div className="post-card__image-container">
        {!imageLoaded && (
          <div className="image-loading-skeleton">
            <div className="loading-shimmer"></div>
          </div>
        )}
        <img
          src={post.imageUrl}
          alt={post.caption || 'Post image'}
          className={`post-card__image ${imageLoaded ? 'loaded' : 'loading'}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => console.error('Failed to load image')}
        />
      </div>

      {/* Post Info */}
      <div className="post-card__info">
        {/* User Info & Follow Button */}
        <div className="post-card__header">
          <div className="post-card__user">
            <div className="post-card__avatar"></div>
            <UserLink
              userId={post.userId}
              username={post.userHandle}
              className="post-card__username"
            />
          </div>
          {!isOwnPost && <FollowButton userId={post.userId} />}
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="post-card__caption">{post.caption}</p>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="post-card__tags">
            {post.tags.map((tag, index) => (
              <span key={index} className="post-card__tag">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p className="post-card__timestamp">
          {new Date(post.createdAt).toLocaleString()}
        </p>
      </div>

      {/* Actions */}
      <div className="post-card__actions">
        <div className="action-buttons">
          {/* Like Button */}
          <div className="action-button-wrapper">
            <button
              className={`tama-btn tama-btn--icon ${isLiked ? 'tama-btn--liked' : ''}`}
              onClick={toggleLike}
              disabled={likeLoading}
              aria-label={isLiked ? 'Unlike' : 'Like'}
              data-testid="like-button"
            >
              <MaterialIcon
                name="favorite"
                variant={isLiked ? 'filled' : 'outlined'}
                size="md"
              />
            </button>
            <span className="action-count" data-testid="like-count">{likesCount}</span>
          </div>

          {/* Comment Button */}
          <div className="action-button-wrapper">
            <button
              className="tama-btn tama-btn--icon"
              aria-label="Comment"
            >
              <MaterialIcon name="chat_bubble" variant="outlined" size="md" />
            </button>
            <span className="action-count">{post.commentsCount}</span>
          </div>

          {/* Share Button */}
          <div className="action-button-wrapper">
            <button
              className="tama-btn tama-btn--icon"
              aria-label="Share"
            >
              <MaterialIcon name="share" variant="outlined" size="md" />
            </button>
          </div>
        </div>
      </div>

      {/* Comments Section (optional) */}
      {showComments && (
        <div className="post-card__comments">
          <h4 className="post-card__comments-heading">Comments</h4>
          <div className="post-card__comments-empty">
            <p>Comments coming soon...</p>
          </div>
        </div>
      )}
    </article>
  );
};
