'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { Post } from '@/lib/graphql/types';
import { likePost, unlikePost } from '@/app/actions/posts';

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticLiked, setOptimisticLiked] = useState(post.isLiked);
  const [optimisticCount, setOptimisticCount] = useState(post.likesCount);

  const handleLike = () => {
    // Optimistic update - instant UI feedback
    const newLiked = !optimisticLiked;
    setOptimisticLiked(newLiked);
    setOptimisticCount(newLiked ? optimisticCount + 1 : optimisticCount - 1);

    // Server action - runs in background
    startTransition(async () => {
      const result = newLiked
        ? await likePost(post.id)
        : await unlikePost(post.id);

      if (!result.success) {
        // Revert on error
        setOptimisticLiked(!newLiked);
        setOptimisticCount(newLiked ? optimisticCount - 1 : optimisticCount + 1);
        alert(result.message || 'Failed to update like');
      }
    });
  };

  const handleComment = () => {
    // Navigate to post detail page for commenting
    window.location.href = `/post/${post.id}`;
  };

  return (
    <article className="post-card">
      <div className="post-header">
        <Link href={`/profile/${post.author.handle}`}>
          <img
            src={post.author.profilePictureUrl || '/default-avatar.png'}
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
        {post.caption && <p>{post.caption}</p>}
        {post.thumbnailUrl && (
          <div className="post-media">
            <img
              src={post.thumbnailUrl}
              alt="Post image"
            />
          </div>
        )}
      </div>

      <div className="post-actions">
        <button
          className="action-button"
          onClick={handleLike}
          disabled={isPending}
          style={{
            opacity: isPending ? 0.6 : 1,
            color: optimisticLiked ? '#e91e63' : undefined,
          }}
        >
          <span className="material-icons">
            {optimisticLiked ? 'favorite' : 'favorite_border'}
          </span>
          <span>{optimisticCount}</span>
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
