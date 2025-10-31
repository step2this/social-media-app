/**
 * Feature Flags Configuration
 *
 * Centralized feature flags for enabling/disabling features during development
 * and progressive rollouts.
 *
 * Usage:
 * - Set environment variables in .env.local (create from .env.example)
 * - Use flags in components to conditionally render features
 *
 * @example
 * ```typescript
 * import { ENABLE_RELAY_POC } from '@/config/featureFlags';
 *
 * if (ENABLE_RELAY_POC) {
 *   return <RelayFeature />;
 * }
 * ```
 */

/**
 * Enable Relay Proof of Concept
 *
 * When true, shows the SimplePostList component that demonstrates
 * Relay is working correctly.
 *
 * Set in .env.local:
 * ```
 * VITE_ENABLE_RELAY_POC=true
 * ```
 */
export const ENABLE_RELAY_POC =
  import.meta.env.VITE_ENABLE_RELAY_POC === 'true';

/**
 * Enable Relay for specific features
 *
 * As we migrate features to Relay, we can toggle them individually.
 * This allows for gradual rollout and easy rollback.
 *
 * Set environment variables in .env.local:
 * ```
 * VITE_RELAY_NOTIFICATION_BELL=true
 * VITE_RELAY_HOME_FEED=true
 * VITE_RELAY_POST_DETAIL=true
 * ```
 */
export const RELAY_FEATURES = {
  /**
   * Use Relay for NotificationBell component
   * Phase 1 of migration plan
   *
   * Status: ✅ Ready for testing
   * Components: NotificationBellRelay, NotificationItemRelay
   */
  notificationBell: import.meta.env.VITE_RELAY_NOTIFICATION_BELL === 'true',

  /**
   * Use Relay for HomePage feed
   * Phase 2 of migration plan
   *
   * Status: ✅ Ready for testing
   * Components: HomePage.relay.tsx
   * Query: followingFeed with pagination
   */
  homeFeed: import.meta.env.VITE_RELAY_HOME_FEED === 'true',

  /**
   * Use Relay for ExplorePage feed
   * Phase 2 of migration plan
   *
   * Status: ✅ Ready for testing
   * Components: ExplorePage.relay.tsx
   * Query: exploreFeed with pagination
   */
  exploreFeed: import.meta.env.VITE_RELAY_EXPLORE_FEED === 'true',

  /**
   * Use Relay for PostDetailPage
   * Phase 3 of migration plan
   *
   * Status: 🔄 Not yet implemented
   */
  postDetail: import.meta.env.VITE_RELAY_POST_DETAIL === 'true',
} as const;
