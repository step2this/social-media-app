/**
 * Test: Verify no code imports deleted legacy components
 *
 * This test ensures that legacy components that have been replaced
 * by Relay versions are not imported anywhere in the codebase.
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('GraphQL Services Cleanup', () => {
  const legacyComponents = [
    { name: 'PostDetailPage.tsx', path: 'components/posts/PostDetailPage.tsx' },
    { name: 'ProfilePage.tsx', path: 'components/profile/ProfilePage.tsx' },
  ];

  legacyComponents.forEach(({ name, path }) => {
    it(`should have no imports of legacy ${name}`, () => {
      try {
        const result = execSync(
          `grep -r "from.*${path}" packages/frontend/src --exclude-dir=node_modules --exclude-dir=__tests__ --exclude-dir=__generated__`,
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
  });

  it('should have HomePage using Relay version', () => {
    try {
      const result = execSync(
        `grep -r "from.*HomePage.relay" packages/frontend/src/App.tsx`,
        { encoding: 'utf-8', cwd: '/Users/shaperosteve/social-media-app' }
      );
      // Should find the Relay import
      expect(result).toContain('HomePage.relay');
    } catch (error: any) {
      throw new Error('App.tsx should import HomePage from HomePage.relay');
    }
  });

  it('should have ExplorePage using Relay version', () => {
    try {
      const result = execSync(
        `grep -r "from.*ExplorePage.relay" packages/frontend/src/App.tsx`,
        { encoding: 'utf-8', cwd: '/Users/shaperosteve/social-media-app' }
      );
      // Should find the Relay import
      expect(result).toContain('ExplorePage.relay');
    } catch (error: any) {
      throw new Error('App.tsx should import ExplorePage from ExplorePage.relay');
    }
  });

  it('should have PostDetailPage using Relay version', () => {
    try {
      const result = execSync(
        `grep -r "PostDetailPageRelay" packages/frontend/src/App.tsx`,
        { encoding: 'utf-8', cwd: '/Users/shaperosteve/social-media-app' }
      );
      // Should find the Relay import
      expect(result).toContain('PostDetailPageRelay');
    } catch (error: any) {
      throw new Error('App.tsx should import PostDetailPageRelay');
    }
  });

  it('should have ProfilePage using Relay version', () => {
    try {
      const result = execSync(
        `grep -r "ProfilePageRelay" packages/frontend/src/App.tsx`,
        { encoding: 'utf-8', cwd: '/Users/shaperosteve/social-media-app' }
      );
      // Should find the Relay import
      expect(result).toContain('ProfilePageRelay');
    } catch (error: any) {
      throw new Error('App.tsx should import ProfilePageRelay');
    }
  });

  it('should have NotificationsPage using Relay version', () => {
    try {
      const result = execSync(
        `grep -r "NotificationsPageRelay" packages/frontend/src/App.tsx`,
        { encoding: 'utf-8', cwd: '/Users/shaperosteve/social-media-app' }
      );
      // Should find the Relay import
      expect(result).toContain('NotificationsPageRelay');
    } catch (error: any) {
      throw new Error('App.tsx should import NotificationsPageRelay');
    }
  });
});
