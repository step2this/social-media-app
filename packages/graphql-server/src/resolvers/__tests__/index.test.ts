/**
 * createResolvers Tests
 *
 * TDD for main resolver factory.
 * Tests resolver wiring and composition.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Container } from '../../infrastructure/di/Container.js';
import { createResolvers } from '../index.js';

describe('createResolvers', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();

    // Register all required use cases
    container.register('GetCurrentUserProfile', () => ({ execute: vi.fn() }));
    container.register('GetProfileByHandle', () => ({ execute: vi.fn() }));
    container.register('GetPostById', () => ({ execute: vi.fn() }));
    container.register('GetUserPosts', () => ({ execute: vi.fn() }));
    container.register('GetFollowingFeed', () => ({ execute: vi.fn() }));
    container.register('GetExploreFeed', () => ({ execute: vi.fn() }));
  });

  describe('Resolver structure', () => {
    it('should create resolvers object with Query field', () => {
      const resolvers = createResolvers(container);

      expect(resolvers).toBeDefined();
      expect(resolvers.Query).toBeDefined();
    });

    it('should include all profile resolvers', () => {
      const resolvers = createResolvers(container);

      expect(typeof resolvers.Query?.me).toBe('function');
      expect(typeof resolvers.Query?.profile).toBe('function');
    });

    it('should include all post resolvers', () => {
      const resolvers = createResolvers(container);

      expect(typeof resolvers.Query?.post).toBe('function');
      expect(typeof resolvers.Query?.userPosts).toBe('function');
    });

    it('should include all feed resolvers', () => {
      const resolvers = createResolvers(container);

      expect(typeof resolvers.Query?.followingFeed).toBe('function');
      expect(typeof resolvers.Query?.exploreFeed).toBe('function');
    });
  });

  describe('Resolver count', () => {
    it('should have exactly 6 Query resolvers', () => {
      const resolvers = createResolvers(container);

      const queryResolvers = Object.keys(resolvers.Query || {});
      
      expect(queryResolvers).toHaveLength(6);
      expect(queryResolvers).toEqual(
        expect.arrayContaining([
          'me',
          'profile',
          'post',
          'userPosts',
          'followingFeed',
          'exploreFeed',
        ])
      );
    });
  });

  describe('Integration', () => {
    it('should create resolvers that can be called', () => {
      const resolvers = createResolvers(container);

      expect(() => resolvers.Query?.me).not.toThrow();
      expect(() => resolvers.Query?.profile).not.toThrow();
      expect(() => resolvers.Query?.post).not.toThrow();
      expect(() => resolvers.Query?.userPosts).not.toThrow();
      expect(() => resolvers.Query?.followingFeed).not.toThrow();
      expect(() => resolvers.Query?.exploreFeed).not.toThrow();
    });
  });
});
