'use client';

import Link from 'next/link';

interface Post {
  id: string;
  author: {
    username: string;
    handle: string;
    avatar?: string;
  };
  caption: string;
  imageUrl?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const handleLike = () => {
    // Will be connected in Phase 4
    console.log('Like post:', post.id);
  };

  const handleComment = () => {
    // Will be connected in Phase 4
    console.log('Comment on post:', post.id);
  };

  return (
    <article className="post-card">
      <div className="post-header">
        <Link href={`/profile/${post.author.handle}`}>
          <img
            src={post.author.avatar || '/default-avatar.png'}
            alt={post.author.username}
            className="avatar"
          />
        </Link>
        <div className="post-meta">
          <Link href={`/profile/${post.author.handle}`}>
            <strong>{post.author.username}</strong>
            <span className="handle">@{post.author.handle}</span>
          </Link>
          <time>{new Date(post.createdAt).toLocaleDateString()}</time>
        </div>
      </div>

      <div className="post-content">
        <p>{post.caption}</p>
        {post.imageUrl && (
          <div className="post-media">
            <img
              src={post.imageUrl}
              alt="Post image"
            />
          </div>
        )}
      </div>

      <div className="post-actions">
        <button className="action-button" onClick={handleLike}>
          <span className="material-icons">favorite_border</span>
          <span>{post.likesCount}</span>
        </button>
        <button className="action-button" onClick={handleComment}>
          <span className="material-icons">comment</span>
          <span>{post.commentsCount}</span>
        </button>
        <button className="action-button">
          <span className="material-icons">share</span>
        </button>
      </div>
    </article>
  );
}
