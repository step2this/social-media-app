/**
 * Scenario Builders - Barrel Export
 * 
 * High-level scenario builders that compose entity builders to create
 * realistic test data patterns. Use these for quick test data generation
 * without manually orchestrating individual entity builders.
 * 
 * @example
 * ```typescript
 * import { PopularPostScenario, ActiveCommunityScenario } from './scripts/builders/scenarios';
 * 
 * // Create a viral post scenario
 * const viralScenario = await new PopularPostScenario().build();
 * console.log(`Created influencer with ${viralScenario.totalLikes} likes`);
 * 
 * // Create an active community
 * const communityScenario = await new ActiveCommunityScenario().build();
 * console.log(`Created ${communityScenario.users.length} users with ${communityScenario.posts.length} posts`);
 * ```
 */

// Base Scenario Builder
export { ScenarioBuilder } from './ScenarioBuilder.js';

// Concrete Scenarios
export { PopularPostScenario } from './PopularPostScenario.js';
export type { PopularPostResult } from './PopularPostScenario.js';

export { ActiveCommunityScenario } from './ActiveCommunityScenario.js';
export type { ActiveCommunityResult } from './ActiveCommunityScenario.js';
