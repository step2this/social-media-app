import type { PostGridItem } from '@social-media-app/shared';
import { groupBy, keys, filter } from 'lodash-es';

/**
 * Scramble posts to maximize user diversity in a grid layout
 * Ensures adjacent posts (horizontally and vertically) are from different users
 *
 * @param posts - Array of posts to scramble
 * @param gridWidth - Number of columns in the grid (default: 3)
 * @returns Scrambled array of posts with maximum user diversity
 */
export function scramblePosts(posts: PostGridItem[], gridWidth: number = 3): PostGridItem[] {
  if (posts.length === 0) return posts;

  // Group posts by userId
  const postsByUser = groupBy(posts, 'userId');

  const userIds = keys(postsByUser);
  const scrambled: PostGridItem[] = [];

  // Round-robin through users to maximize diversity
  let userIndex = 0;
  let positionInRow = 0;
  const usedInPreviousRow: string[] = [];

  while (scrambled.length < posts.length) {
    let attempts = 0;
    let foundPost = false;

    // Try to find a user different from adjacent positions
    while (attempts < userIds.length && !foundPost) {
      const currentUserId = userIds[userIndex % userIds.length];
      const userPosts = postsByUser[currentUserId];

      if (userPosts && userPosts.length > 0) {
        // Check if this user is different from:
        // 1. Previous post in same row (left neighbor)
        // 2. Post directly above (same column, previous row)
        const leftNeighbor = scrambled[scrambled.length - 1];
        const aboveNeighbor = scrambled[scrambled.length - gridWidth];

        const isDifferentFromLeft = !leftNeighbor || leftNeighbor.userId !== currentUserId;
        const isDifferentFromAbove = !aboveNeighbor || aboveNeighbor.userId !== currentUserId;

        if (isDifferentFromLeft && isDifferentFromAbove) {
          scrambled.push(userPosts.shift()!);
          foundPost = true;

          // Track for next row
          if (positionInRow === gridWidth - 1) {
            usedInPreviousRow.push(currentUserId);
            if (usedInPreviousRow.length > gridWidth) {
              usedInPreviousRow.shift();
            }
          }
        }
      }

      userIndex++;
      attempts++;
    }

    // If we couldn't find a good match after trying all users, just take any available post
    if (!foundPost) {
      const availableUserIds = filter(userIds, userId =>
        postsByUser[userId]?.length > 0
      );
      if (availableUserIds.length > 0) {
        scrambled.push(postsByUser[availableUserIds[0]].shift()!);
      }
    }

    positionInRow = (positionInRow + 1) % gridWidth;
  }

  return scrambled;
}
