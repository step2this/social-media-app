import { useCallback } from 'react';
import { useFragment, graphql } from 'react-relay';
import { CommentForm } from './CommentForm';
import { CommentItem } from './CommentItem';
import type { CommentList_post$key } from './__generated__/CommentList_post.graphql';
import './CommentList.css';

interface CommentListProps {
  post: CommentList_post$key;
  currentUserId?: string;
}

/**
 * CommentList component for displaying and managing comments on a post
 * Uses Relay fragment to get post data with comments
 */
export const CommentList = ({ post: postRef, currentUserId }: CommentListProps) => {
  const post = useFragment(
    graphql`
      fragment CommentList_post on Post {
        id
        comments(first: 20) {
          edges {
            node {
              id
              ...CommentItem_comment
            }
          }
        }
      }
    `,
    postRef
  );

  /**
   * Handle comment deleted - just for callback, Relay handles store update
   */
  const handleCommentDeleted = useCallback((_commentId: string) => {
    // Relay updater in CommentItem handles store deletion
    // This is just for any additional side effects if needed
  }, []);

  const comments = post.comments.edges.map(edge => edge.node);

  return (
    <div className="comment-list" data-testid="comment-list" aria-label="Comments list">
      {/* Empty State */}
      {comments.length === 0 && (
        <div className="comment-list__empty" data-testid="comment-list-empty">
          <p className="comment-list__empty-message">
            No comments yet. Be the first to comment!
          </p>
        </div>
      )}

      {/* Comments List */}
      {comments.length > 0 && (
        <div className="comment-list__items">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onCommentDeleted={handleCommentDeleted}
            />
          ))}
        </div>
      )}

      {/* Comment Form - at bottom */}
      <CommentForm postId={post.id} />
    </div>
  );
};
