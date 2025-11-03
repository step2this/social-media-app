import React, { useState } from 'react';
import { useFragment, useMutation, graphql } from 'react-relay';
import { useNavigate } from 'react-router-dom';
import type { PostCardRelay_post$key } from './__generated__/PostCardRelay_post.graphql';
import type { PostCardRelayLikeMutation } from './__generated__/PostCardRelayLikeMutation.graphql';
import type { PostCardRelayUnlikeMutation } from './__generated__/PostCardRelayUnlikeMutation.graphql';
import { MaterialIcon } from '../common/MaterialIcon';
import { UserLink } from '../common/UserLink';
import { FollowButton } from '../common/FollowButton';
import { CommentList } from '../comments/CommentList';
import { DevFeedSourceBadge, type FeedSource } from '../dev';
import './PostCard.css';

export interface PostCardRelayProps {
  post: PostCardRelay_post$key;
  currentUserId?: string;
  showComments?: boolean;
  compact?: boolean;
  variant?: 'feed' | 'detail';
  showDevBadge?: boolean;
  feedSource?: FeedSource;
}

/**
 * Relay-powered post card component
 * Uses Relay mutations for optimistic updates
 */
export const PostCardRelay: React.FC<PostCardRelayProps> = ({
  post: postRef,
  currentUserId,
  showComments = false,
  compact = false,
  variant = 'feed',
  showDevBadge = false,
  feedSource = 'materialized'
}) => {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);

  const post = useFragment(
    graphql`
      fragment PostCardRelay_post on Post {
        id
        userId
        userHandle: author {
          handle
          username
        }
        caption
        imageUrl
        likesCount
        isLiked
        commentsCount
        createdAt
        ...CommentList_post
      }
    `,
    postRef
  );

  const [commitLike, isLikeInFlight] = useMutation<PostCardRelayLikeMutation>(
    graphql`
      mutation PostCardRelayLikeMutation($postId: ID!) {
        likePost(postId: $postId) {
          success
          likesCount
          isLiked
        }
      }
    `
  );

  const [commitUnlike, isUnlikeInFlight] = useMutation<PostCardRelayUnlikeMutation>(
    graphql`
      mutation PostCardRelayUnlikeMutation($postId: ID!) {
        unlikePost(postId: $postId) {
          success
          likesCount
          isLiked
        }
      }
    `
  );

  const isOwnPost = currentUserId && currentUserId === post.userId;
  const isLoading = isLikeInFlight || isUnlikeInFlight;

  const toggleLike = () => {
    if (isLoading) return;

    const isCurrentlyLiked = post.isLiked;
    const mutation = isCurrentlyLiked ? commitUnlike : commitLike;
    const optimisticLikesCount = isCurrentlyLiked
      ? post.likesCount - 1
      : post.likesCount + 1;

    mutation({
      variables: { postId: post.id },
      optimisticResponse: {
        [isCurrentlyLiked ? 'unlikePost' : 'likePost']: {
          success: true,
          likesCount: optimisticLikesCount,
          isLiked: !isCurrentlyLiked,
        },
      },
      optimisticUpdater: (store) => {
        const postRecord = store.get(post.id);
        if (postRecord) {
          postRecord.setValue(!isCurrentlyLiked, 'isLiked');
          postRecord.setValue(optimisticLikesCount, 'likesCount');
        }
      },
      onCompleted: (response) => {
        const result = isCurrentlyLiked
          ? ('unlikePost' in response ? response.unlikePost : null)
          : ('likePost' in response ? response.likePost : null);
        if (!result?.success) {
          console.error('Failed to toggle like');
        }
      },
      onError: (error) => {
        console.error('Error toggling like:', error);
      },
    });
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/post/${post.id}`);
  };

  const cardClasses = [
    'post-card',
    compact && 'post-card--compact',
    variant === 'detail' && 'post-card--detail'
  ].filter(Boolean).join(' ');

  return (
    <article className={cardClasses} data-testid="post-card">
      {showDevBadge && <DevFeedSourceBadge feedSource={feedSource} />}

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

      <div className="post-card__info">
        <div className="post-card__header">
          <div className="post-card__user">
            <div className="post-card__avatar"></div>
            <UserLink
              userId={post.userId}
              username={post.userHandle.handle}
              className="post-card__username"
            />
          </div>
          {!isOwnPost && <FollowButton userId={post.userId} />}
        </div>

        {post.caption && (
          <p className="post-card__caption">{post.caption}</p>
        )}

        <p className="post-card__timestamp">
          {new Date(post.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="post-card__actions">
        <div className="action-buttons">
          <div className="action-button-wrapper">
            <button
              className={`tama-btn tama-btn--icon ${post.isLiked ? 'tama-btn--liked' : ''}`}
              onClick={toggleLike}
              disabled={isLoading}
              aria-label={post.isLiked ? 'Unlike' : 'Like'}
              data-testid="like-button"
            >
              <MaterialIcon
                name="favorite"
                variant={post.isLiked ? 'filled' : 'outlined'}
                size="md"
              />
            </button>
            <span className="action-count" data-testid="like-count">
              {post.likesCount}
            </span>
          </div>

          <div className="action-button-wrapper">
            <button
              className="tama-btn tama-btn--icon"
              onClick={handleCommentClick}
              disabled={isLoading}
              aria-label={`View ${post.commentsCount || 0} comments`}
              data-testid="comment-button"
            >
              <MaterialIcon name="chat_bubble" variant="outlined" size="md" />
            </button>
            <span className="action-count">{post.commentsCount}</span>
          </div>

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

      {/* Comments Section - shown on detail pages or when explicitly requested */}
      {(showComments || variant === 'detail') && (
        <div className="post-card__comments">
          <CommentList post={post} currentUserId={currentUserId} />
        </div>
      )}
    </article>
  );
};

// Export alias for backward compatibility
export { PostCardRelay as PostCard };
