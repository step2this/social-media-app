import { groupBy, chunk, shuffle, sortBy } from 'lodash-es';
import type { PostGridItem } from '@social-media-app/shared';

/**
 * Test/Example file to verify lodash-es works correctly with ESM imports
 * This demonstrates proper tree-shakeable named import syntax
 */

/**
 * Example 1: groupBy - Group posts by userId
 */
export function groupPostsByUser(posts: PostGridItem[]): Record<string, PostGridItem[]> {
  return groupBy(posts, 'userId');
}

/**
 * Example 2: chunk - Break posts into pages/batches
 */
export function chunkPosts(posts: PostGridItem[], size: number = 24): PostGridItem[][] {
  return chunk(posts, size);
}

/**
 * Example 3: shuffle - Randomize post order
 */
export function shufflePosts(posts: PostGridItem[]): PostGridItem[] {
  return shuffle(posts);
}

/**
 * Example 4: sortBy - Sort posts by multiple criteria
 */
export function sortPostsByLikes(posts: PostGridItem[]): PostGridItem[] {
  return sortBy(posts, [(post) => -post.likesCount, 'createdAt']);
}

/**
 * Example 5: Composition - Combine multiple lodash functions
 */
export function processPosts(posts: PostGridItem[]): {
  byUser: Record<string, PostGridItem[]>;
  shuffled: PostGridItem[];
  topLiked: PostGridItem[];
  pages: PostGridItem[][];
} {
  return {
    byUser: groupBy(posts, 'userId'),
    shuffled: shuffle(posts),
    topLiked: sortBy(posts, (post) => -post.likesCount).slice(0, 10),
    pages: chunk(posts, 24)
  };
}
