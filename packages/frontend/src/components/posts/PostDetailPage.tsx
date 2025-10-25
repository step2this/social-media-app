import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PostServiceGraphQL } from '../../services/implementations/PostService.graphql';
import { createGraphQLClient } from '../../graphql/client';
import { isSuccess, isError } from '../../graphql/types';
import type { PostWithAuthor } from '@social-media-app/shared';
import type { Post as GraphQLPost } from '../../services/interfaces/IPostService';
import { ContentLayout } from '../layout/AppLayout';
import { MaterialIcon } from '../common/MaterialIcon';
import { PostCard } from './PostCard';
import { CommentList } from '../comments';
import { useAuth } from '../../hooks/useAuth';
import './PostDetailPage.css';

// Initialize post service
const postService = new PostServiceGraphQL(createGraphQLClient());

/**
 * Transform GraphQL Post to PostWithAuthor for display
 * Flattens the nested author structure to match feed item format
 */
function transformPostToPostWithAuthor(post: GraphQLPost): PostWithAuthor {
  return {
    id: post.id,
    userId: post.userId,
    userHandle: post.author.handle,
    imageUrl: post.imageUrl,
    caption: post.caption ?? undefined,
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    createdAt: post.createdAt,
    authorId: post.author.id,
    authorHandle: post.author.handle,
    authorFullName: post.author.displayName ?? undefined,
    authorProfilePictureUrl: post.author.profilePictureUrl ?? undefined,
    isLiked: post.isLiked ?? undefined,
  };
}

interface PostDetailPageProps { }

export const PostDetailPage: React.FC<PostDetailPageProps> = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<PostWithAuthor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) {
      setError('Post ID is required');
      setLoading(false);
      return;
    }

    const fetchPost = async () => {
      try {
        setLoading(true);
        const result = await postService.getPost(postId);

        if (isSuccess(result)) {
          setPost(transformPostToPostWithAuthor(result.data));
        } else if (isError(result)) {
          setError(result.error.message);
        }
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
          {/* Close Button */}
          <button
            onClick={handleBackClick}
            className="close-button"
            aria-label="Close"
          >
            <MaterialIcon name="close" variant="outlined" size="md" />
          </button>

          {/* Post Card with Comments */}
          <PostCard
            post={post}
            showComments={true}
            variant="detail"
          />

          {/* Comments Section */}
          <div className="post-detail__comments">
            <CommentList
              postId={post.id}
              currentUserId={user?.id}
            />
          </div>
        </div>
      </div>
    </ContentLayout>
  );
};
