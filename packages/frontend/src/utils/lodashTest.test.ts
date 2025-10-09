import { describe, it, expect } from 'vitest';
import {
  groupPostsByUser,
  chunkPosts,
  shufflePosts,
  sortPostsByLikes,
  processPosts
} from './lodashTest.js';
import type { PostGridItem } from '@social-media-app/shared';

// Helper to create mock posts
function createMockPost(id: string, userId: string, likesCount: number = 0): PostGridItem {
  return {
    id,
    userId,
    userHandle: `user_${userId}`,
    thumbnailUrl: `https://example.com/${id}.jpg`,
    caption: `Post ${id}`,
    likesCount,
    commentsCount: 0,
    createdAt: new Date().toISOString()
  };
}

describe('lodash-es integration tests', () => {
  describe('groupPostsByUser', () => {
    it('should group posts by userId', () => {
      const posts = [
        createMockPost('1', 'userA'),
        createMockPost('2', 'userB'),
        createMockPost('3', 'userA'),
        createMockPost('4', 'userC')
      ];

      const grouped = groupPostsByUser(posts);

      expect(grouped['userA']).toHaveLength(2);
      expect(grouped['userB']).toHaveLength(1);
      expect(grouped['userC']).toHaveLength(1);
      expect(grouped['userA'][0].id).toBe('1');
      expect(grouped['userA'][1].id).toBe('3');
    });

    it('should handle empty array', () => {
      const result = groupPostsByUser([]);
      expect(result).toEqual({});
    });
  });

  describe('chunkPosts', () => {
    it('should chunk posts into pages of specified size', () => {
      const posts = Array.from({ length: 50 }, (_, i) =>
        createMockPost(`post${i}`, 'user1')
      );

      const chunks = chunkPosts(posts, 24);

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toHaveLength(24);
      expect(chunks[1]).toHaveLength(24);
      expect(chunks[2]).toHaveLength(2);
    });

    it('should handle exact multiple of chunk size', () => {
      const posts = Array.from({ length: 48 }, (_, i) =>
        createMockPost(`post${i}`, 'user1')
      );

      const chunks = chunkPosts(posts, 24);

      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toHaveLength(24);
      expect(chunks[1]).toHaveLength(24);
    });
  });

  describe('shufflePosts', () => {
    it('should return array with same length', () => {
      const posts = Array.from({ length: 10 }, (_, i) =>
        createMockPost(`post${i}`, 'user1')
      );

      const shuffled = shufflePosts(posts);

      expect(shuffled).toHaveLength(10);
    });

    it('should contain all original posts', () => {
      const posts = [
        createMockPost('1', 'userA'),
        createMockPost('2', 'userB'),
        createMockPost('3', 'userC')
      ];

      const shuffled = shufflePosts(posts);

      expect(shuffled).toHaveLength(3);
      expect(shuffled.map(p => p.id).sort()).toEqual(['1', '2', '3']);
    });
  });

  describe('sortPostsByLikes', () => {
    it('should sort posts by likes count descending', () => {
      const posts = [
        createMockPost('1', 'userA', 5),
        createMockPost('2', 'userB', 20),
        createMockPost('3', 'userC', 10),
        createMockPost('4', 'userD', 15)
      ];

      const sorted = sortPostsByLikes(posts);

      expect(sorted[0].likesCount).toBe(20);
      expect(sorted[1].likesCount).toBe(15);
      expect(sorted[2].likesCount).toBe(10);
      expect(sorted[3].likesCount).toBe(5);
    });
  });

  describe('processPosts', () => {
    it('should process posts with multiple operations', () => {
      const posts = [
        createMockPost('1', 'userA', 10),
        createMockPost('2', 'userB', 5),
        createMockPost('3', 'userA', 15),
        createMockPost('4', 'userC', 20)
      ];

      const result = processPosts(posts);

      expect(result.byUser['userA']).toHaveLength(2);
      expect(result.byUser['userB']).toHaveLength(1);
      expect(result.shuffled).toHaveLength(4);
      expect(result.topLiked[0].likesCount).toBe(20);
      expect(result.pages).toHaveLength(1);
      expect(result.pages[0]).toHaveLength(4);
    });
  });
});
