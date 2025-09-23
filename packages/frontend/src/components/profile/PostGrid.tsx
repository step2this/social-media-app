import React from 'react';
import type { PostGridItem } from '@social-media-app/shared';
import { PostThumbnail } from './PostThumbnail';

interface PostGridProps {
  posts: PostGridItem[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

/**
 * Grid view of posts
 */
export const PostGrid: React.FC<PostGridProps> = ({
  posts,
  loading,
  hasMore,
  onLoadMore
}) => {
  if (posts.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No posts yet</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-1 md:gap-2">
        {posts.map((post) => (
          <PostThumbnail key={post.id} post={post} />
        ))}
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}

      {hasMore && !loading && (
        <div className="text-center py-8">
          <button
            onClick={onLoadMore}
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
};