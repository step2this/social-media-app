import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { postService } from '../../services/postService';
import type { Post } from '@social-media-app/shared';
import { ContentLayout } from '../layout/AppLayout';
import { MaterialIcon } from '../common/MaterialIcon';
import { useLike } from '../../hooks/useLike.js';
import { UserLink } from '../common/UserLink.js';
import { FollowButton } from '../common/FollowButton.js';
import './PostDetailPage.css';

interface PostDetailPageProps {}

export const PostDetailPage: React.FC<PostDetailPageProps> = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Initialize like hook with post data
  const {
    isLiked,
    likesCount,
    isLoading: likeLoading,
    toggleLike
  } = useLike(postId || '', {
    initialIsLiked: post?.isLiked || false,
    initialLikesCount: post?.likesCount || 0
  });

  useEffect(() => {
    if (!postId) {
      setError('Post ID is required');
      setLoading(false);
      return;
    }

    const fetchPost = async () => {
      try {
        setLoading(true);
        const fetchedPost = await postService.getPost(postId);
        setPost(fetchedPost);
      } catch (err) {
        console.error('Error fetching post:', err);
        setError(err instanceof Error ? err.message : 'Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  const handleBackClick = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <ContentLayout>
        <div className="post-detail-loading" data-testid="post-detail-loading">
          <div className="loading-container">
            <div className="loading-shimmer-container"></div>
          </div>
        </div>
      </ContentLayout>
    );
  }

  if (error || !post) {
    return (
      <ContentLayout>
        <div className="post-detail-error" data-testid="post-detail-error">
          <div className="error-content">
            <div className="error-message">
              {error || 'Post not found'}
            </div>
            <button
              onClick={handleBackClick}
              className="tama-btn tama-btn--automotive tama-btn--racing-red"
              aria-label="Go back"
            >
              Go Back
            </button>
          </div>
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout>
      <div className="post-detail-page" data-testid="post-detail-page">
        <div className="post-detail-container" data-testid="post-detail-container">
          {/* Main Content */}
          <div className="post-content-wrapper">
            {/* Image Section with Close Button */}
            <div className="post-image-section">
              <button
                onClick={handleBackClick}
                className="close-button"
                aria-label="Close"
              >
                <MaterialIcon name="close" variant="outlined" size="md" />
              </button>
              <div className="post-image-container">
                {!imageLoaded && (
                  <div className="image-loading-skeleton">
                    <div className="loading-shimmer"></div>
                  </div>
                )}
                <img
                  src={post.imageUrl}
                  alt={post.caption || 'Post image'}
                  className={`post-image ${imageLoaded ? 'loaded' : 'loading'}`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setError('Failed to load image')}
                />
              </div>
            </div>

            {/* Content Below Image */}
            <div className="post-sidebar">
              {/* Post Info */}
              <div className="post-info-section">
                <div className="sidebar-user-info">
                  <div className="sidebar-user-avatar"></div>
                  <UserLink
                    userId={post.userId}
                    username={post.userHandle}
                    className="sidebar-user-handle"
                  />
                  <FollowButton
                    userId={post.userId}
                    initialIsFollowing={false}
                  />
                </div>

                {post.caption && (
                  <p className="post-caption">{post.caption}</p>
                )}

                {post.tags && post.tags.length > 0 && (
                  <div className="post-tags">
                    {post.tags.map((tag, index) => (
                      <span key={index} className="post-tag">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <p className="post-timestamp">
                  {new Date(post.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Actions */}
              <div className="post-actions">
                <div className="action-buttons">
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

                  <div className="action-button-wrapper">
                    <button
                      className="tama-btn tama-btn--icon"
                      aria-label="Comment"
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

              {/* Comments Section */}
              <div className="comments-section">
                <h4 className="comments-heading">Comments</h4>
                <div className="comments-empty">
                  <p>Comments coming soon...</p>
                </div>
              </div>

              {/* Add Comment */}
              <div className="add-comment-section">
                <div className="comment-input-wrapper">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    className="comment-input"
                    aria-label="Add a comment"
                  />
                  <button className="comment-post-btn">
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ContentLayout>
  );
};