/**
 * Test: Verify no legacy component imports remain
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('Legacy Component Imports', () => {
  it('should have no imports of legacy HomePage', () => {
    try {
      const result = execSync(
        'grep -r "from.*pages/HomePage\\.tsx" packages/frontend/src --exclude-dir=node_modules --exclude-dir=__tests__',
        { encoding: 'utf-8', cwd: '/Users/shaperosteve/social-media-app' }
      );
      // If we get here, grep found matches (bad)
      expect(result).toBe('');
    } catch (error: any) {
      // grep exits with 1 if no matches - this is good!
      if (error.status === 1) {
        expect(true).toBe(true);
      } else {
        throw error;
      }
    }
  });

  it('should have no imports of legacy ExplorePage', () => {
    try {
      const result = execSync(
        'grep -r "from.*explore/ExplorePage\\.tsx" packages/frontend/src --exclude-dir=node_modules --exclude-dir=__tests__',
        { encoding: 'utf-8', cwd: '/Users/shaperosteve/social-media-app' }
      );
      expect(result).toBe('');
    } catch (error: any) {
      if (error.status === 1) {
        expect(true).toBe(true);
      } else {
        throw error;
      }
    }
  });

  it('should have no imports from legacy hooks useFeed, useFeedInfiniteScroll, useHomePage', () => {
    const hooks = ['useFeed', 'useFeedInfiniteScroll', 'useHomePage'];
    
    hooks.forEach(hook => {
      try {
        const result = execSync(
          `grep -r "from.*hooks/${hook}\\.ts" packages/frontend/src --exclude-dir=node_modules --exclude-dir=__tests__`,
          { encoding: 'utf-8', cwd: '/Users/shaperosteve/social-media-app' }
        );
        expect(result).toBe('');
      } catch (error: any) {
        if (error.status === 1) {
          expect(true).toBe(true);
        } else {
          throw error;
        }
      }
    });
  });
});
