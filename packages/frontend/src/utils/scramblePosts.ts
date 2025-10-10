import type { PostGridItem } from '@social-media-app/shared';
import { groupBy } from 'lodash-es';

/**
 * Get the left neighbor of a position in the grid
 * Returns undefined if position is at the start of a row or has no left neighbor
 *
 * @param scrambled - Current scrambled array
 * @param position - Current position (equals scrambled.length, representing next position to fill)
 * @param gridWidth - Number of columns in the grid
 * @returns Left neighbor or undefined
 */
export function getLeftNeighbor(
  scrambled: PostGridItem[],
  position: number,
  gridWidth: number = 3
): PostGridItem | undefined {
  if (scrambled.length === 0 || position === 0) return undefined;
  const isStartOfRow = position % gridWidth === 0;
  if (isStartOfRow) return undefined;
  const leftIndex = position - 1;
  return scrambled[leftIndex];
}

/**
 * Get the above neighbor of a position in the grid
 * Returns undefined if position is in the first row
 *
 * @param scrambled - Current scrambled array
 * @param position - Current position (1-indexed)
 * @param gridWidth - Number of columns in the grid
 * @returns Above neighbor or undefined
 */
export function getAboveNeighbor(
  scrambled: PostGridItem[],
  position: number,
  gridWidth: number
): PostGridItem | undefined {
  const aboveIndex = position - gridWidth;
  return aboveIndex < 0 ? undefined : scrambled[aboveIndex];
}

/**
 * Check if placing a user's post at a position is valid
 * Valid means different from left and above neighbors
 *
 * @param userId - User ID to check
 * @param scrambled - Current scrambled array
 * @param position - Position to check (1-indexed)
 * @param gridWidth - Number of columns in the grid
 * @returns True if placement is valid
 */
export function isValidPlacement(
  userId: string,
  scrambled: PostGridItem[],
  position: number,
  gridWidth: number
): boolean {
  const leftNeighbor = getLeftNeighbor(scrambled, position, gridWidth);
  const aboveNeighbor = getAboveNeighbor(scrambled, position, gridWidth);

  const isDifferentFromLeft = !leftNeighbor || leftNeighbor.userId !== userId;
  const isDifferentFromAbove = !aboveNeighbor || aboveNeighbor.userId !== userId;

  return isDifferentFromLeft && isDifferentFromAbove;
}

/**
 * Get array of user IDs that have available posts
 *
 * @param postsByUser - Map of user IDs to their posts
 * @returns Array of user IDs with available posts
 */
export function getAvailableUserIds(postsByUser: Map<string, PostGridItem[]>): string[] {
  return Array.from(postsByUser.entries())
    .filter(([, posts]) => posts.length > 0)
    .map(([userId]) => userId);
}

/**
 * Find the next valid user ID that satisfies placement constraints
 * Uses round-robin iteration through available users
 *
 * @param userIds - Array of available user IDs
 * @param scrambled - Current scrambled array
 * @param startIndex - Starting index in userIds array
 * @param gridWidth - Number of columns in the grid
 * @param position - Current position (1-indexed)
 * @returns Object with userId and userIndex, or undefined if none found
 */
export function findNextValidUser(
  userIds: string[],
  scrambled: PostGridItem[],
  startIndex: number,
  gridWidth: number,
  position: number
): { userId: string; userIndex: number } | undefined {
  if (userIds.length === 0) return undefined;

  const maxAttempts = userIds.length;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const userIndex = (startIndex + attempt) % userIds.length;
    const userId = userIds[userIndex];

    if (isValidPlacement(userId, scrambled, position, gridWidth)) {
      return { userId, userIndex };
    }
  }

  return undefined;
}

/**
 * Place the next post in the scrambled array
 * Returns new state with updated scrambled array and postsByUser map
 *
 * @param scrambled - Current scrambled array
 * @param postsByUser - Map of user IDs to their posts
 * @param userIndex - Starting user index for round-robin
 * @param gridWidth - Number of columns in the grid
 * @returns New state with updated arrays, or undefined if no posts available
 */
export function placeNextPost(
  scrambled: PostGridItem[],
  postsByUser: Map<string, PostGridItem[]>,
  userIndex: number,
  gridWidth: number
): { scrambled: PostGridItem[]; postsByUser: Map<string, PostGridItem[]>; userIndex: number } | undefined {
  const availableUserIds = getAvailableUserIds(postsByUser);
  if (availableUserIds.length === 0) return undefined;

  const position = scrambled.length;

  // Try to find a valid user
  const validUser = findNextValidUser(availableUserIds, scrambled, userIndex, gridWidth, position);

  // Use valid user if found, otherwise fallback to first available
  const selectedUserId = validUser?.userId ?? availableUserIds[0];
  const nextUserIndex = validUser?.userIndex ?? 0;

  // Get the post and create new state (immutably)
  const userPosts = postsByUser.get(selectedUserId) ?? [];
  const [nextPost, ...remainingPosts] = userPosts;

  if (!nextPost) return undefined;

  // Create new map with updated posts
  const newPostsByUser = new Map(postsByUser);
  newPostsByUser.set(selectedUserId, remainingPosts);

  return {
    scrambled: [...scrambled, nextPost],
    postsByUser: newPostsByUser,
    userIndex: (nextUserIndex + 1) % availableUserIds.length
  };
}

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

  // Group posts by userId and convert to Map
  const grouped = groupBy(posts, 'userId');
  const initialPostsByUser = new Map(
    Object.entries(grouped).map(([userId, userPosts]) => [userId, [...userPosts]])
  );

  // Use functional iteration to build result
  const totalPosts = posts.length;
  let state = {
    scrambled: [] as PostGridItem[],
    postsByUser: initialPostsByUser,
    userIndex: 0
  };

  // Iterate until all posts are placed
  while (state.scrambled.length < totalPosts) {
    const nextState = placeNextPost(state.scrambled, state.postsByUser, state.userIndex, gridWidth);

    if (!nextState) {
      // Should never happen if input is valid, but handle gracefully
      break;
    }

    state = nextState;
  }

  return state.scrambled;
}
