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
 * import { ENABLE_NEW_FEATURE } from '@/config/featureFlags';
 * 
 * if (ENABLE_NEW_FEATURE) {
 *   return <NewFeature />;
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

// Future flags can go here
// Example:
// export const ENABLE_NEW_FEATURE = import.meta.env.VITE_ENABLE_NEW_FEATURE === 'true';
