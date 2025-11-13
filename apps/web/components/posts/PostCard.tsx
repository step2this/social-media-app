'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import type { Post } from '@/lib/graphql/types';
import { likePost, unlikePost } from '@/app/actions/posts';

interface PostCardProps {
  post: Post;
  onLike?: typeof likePost;
  onUnlike?: typeof unlikePost;
}

export function PostCard({
  post,
  onLike = likePost,
  onUnlike = unlikePost
}: PostCardProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticLiked, setOptimisticLiked] = useState(post.isLiked);
  const [optimisticCount, setOptimisticCount] = useState(post.likesCount);

  // Sync internal state with props when they change (after revalidation)
  // This runs when the parent re-fetches and passes in new props
  // BUT: Don't sync while a mutation is pending - we want to preserve optimistic updates
  useEffect(() => {
    console.log('[PostCard useEffect]', {
      postId: post.id,
      isPending,
      'props.isLiked': post.isLiked,
      'props.likesCount': post.likesCount,
      'state.optimisticLiked': optimisticLiked,
      'state.optimisticCount': optimisticCount,
      willSync: !isPending
    });

    // Only sync if there's no pending mutation
    // This prevents revalidation from overwriting optimistic updates
    if (!isPending) {
      setOptimisticLiked(post.isLiked);
      setOptimisticCount(post.likesCount);
    }
  }, [post.isLiked, post.likesCount, isPending]);

  const handleLike = () => {
    // Optimistic update - instant UI feedback
    const newLiked = !optimisticLiked;
    console.log('[PostCard handleLike] Optimistic update', {
      postId: post.id,
      newLiked,
      newCount: newLiked ? optimisticCount + 1 : optimisticCount - 1
    });

    setOptimisticLiked(newLiked);
    setOptimisticCount(newLiked ? optimisticCount + 1 : optimisticCount - 1);

    // Server action - runs in background
    startTransition(async () => {
      const result = newLiked
        ? await onLike(post.id)
        : await onUnlike(post.id);

      console.log('[PostCard handleLike] Server response', {
        postId: post.id,
        result,
        'current props.likesCount': post.likesCount,
        'current props.isLiked': post.isLiked
      });

      if (!result.success) {
        console.log('[PostCard handleLike] Reverting due to error');
        // Revert on error - restore to original prop values
        setOptimisticLiked(post.isLiked);
        setOptimisticCount(post.likesCount);
        alert('Failed to update like. Please try again.');
      } else {
        console.log('[PostCard handleLike] Syncing with server response', {
          'result.isLiked': result.isLiked,
          'result.likesCount': result.likesCount
        });
        // Sync with server response (in case of race conditions)
        setOptimisticLiked(result.isLiked);
        setOptimisticCount(result.likesCount);
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
          data-testid="like-button"
          aria-label={optimisticLiked ? 'Unlike post' : 'Like post'}
          aria-pressed={optimisticLiked ? 'true' : 'false'}
          className="action-button"
          onClick={handleLike}
          disabled={isPending}
          style={{
            opacity: isPending ? 0.6 : 1,
            color: optimisticLiked ? '#e91e63' : undefined,
          }}
        >
          <span className="material-icons" aria-hidden="true">
            {optimisticLiked ? 'favorite' : 'favorite_border'}
          </span>
          <span>{optimisticCount}</span>
        </button>
        <button
          data-testid="comment-button"
          aria-label="Comment on post"
          className="action-button"
          onClick={handleComment}
        >
          <span className="material-icons" aria-hidden="true">comment</span>
          <span>{post.commentsCount}</span>
        </button>
        <button
          data-testid="share-button"
          aria-label="Share post"
          className="action-button"
        >
          <span className="material-icons" aria-hidden="true">share</span>
        </button>
      </div>
    </article>
  );
}
