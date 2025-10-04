import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { postService } from '../../services/postService';
import type { Post } from '@social-media-app/shared';
import { ContentLayout } from '../layout/AppLayout';

interface PostDetailPageProps {}

export const PostDetailPage: React.FC<PostDetailPageProps> = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

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
        <div className="flex justify-center items-center min-h-96">
          <div className="animate-pulse bg-gray-200 w-full max-w-4xl h-96 rounded-lg"></div>
        </div>
      </ContentLayout>
    );
  }

  if (error || !post) {
    return (
      <ContentLayout>
        <div className="flex flex-col items-center justify-center min-h-96 text-center">
          <div className="text-red-500 text-lg mb-4">
            {error || 'Post not found'}
          </div>
          <button
            onClick={handleBackClick}
            className="tama-btn tama-btn--primary"
          >
            Go Back
          </button>
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout>
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <button
            onClick={handleBackClick}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-300 rounded-full mr-3"></div>
            <div>
              <h3 className="font-semibold text-gray-900">@{post.userHandle}</h3>
              <p className="text-sm text-gray-500">
                {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="w-16"></div> {/* Spacer for alignment */}
        </div>

        {/* Main Content */}
        <div className="md:flex">
          {/* Image Section */}
          <div className="md:w-2/3 bg-black flex items-center justify-center">
            <div className="relative">
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                  <div className="animate-pulse bg-gray-300 w-full h-full"></div>
                </div>
              )}
              <img
                src={post.imageUrl}
                alt={post.caption || 'Post image'}
                className={`max-w-full max-h-screen object-contain transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setError('Failed to load image')}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="md:w-1/3 flex flex-col">
            {/* Post Info */}
            <div className="p-4 border-b">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full mr-3"></div>
                <span className="font-semibold">@{post.userHandle}</span>
              </div>

              {post.caption && (
                <p className="text-gray-800 mb-3">{post.caption}</p>
              )}

              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {post.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-500">
                {new Date(post.createdAt).toLocaleString()}
              </p>
            </div>

            {/* Actions */}
            <div className="p-4 border-b">
              <div className="flex items-center gap-4">
                <button className="flex items-center gap-2 hover:text-red-500 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="text-sm font-medium">{post.likesCount}</span>
                </button>

                <button className="flex items-center gap-2 hover:text-blue-500 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="text-sm font-medium">{post.commentsCount}</span>
                </button>

                <button className="flex items-center gap-2 hover:text-green-500 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Comments Section */}
            <div className="flex-1 p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Comments</h4>
              <div className="text-center text-gray-500 py-8">
                <p>Comments coming soon...</p>
              </div>
            </div>

            {/* Add Comment */}
            <div className="p-4 border-t">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button className="px-4 py-2 text-blue-500 font-medium hover:text-blue-600">
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ContentLayout>
  );
};