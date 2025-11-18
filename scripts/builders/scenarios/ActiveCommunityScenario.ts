/**
 * ActiveCommunityScenario - Creates an active community with follow graph and engagement
 * 
 * This scenario creates a realistic social network with multiple users, posts,
 * and engagement patterns. Useful for testing feed algorithms, notifications,
 * follow graphs, and community interactions.
 * 
 * @example
 * ```typescript
 * const scenario = await new ActiveCommunityScenario().build();
 * 
 * console.log(`Community size: ${scenario.users.length} users`);
 * console.log(`Total posts: ${scenario.posts.length}`);
 * console.log(`Total engagement: ${scenario.totalLikes} likes`);
 * ```
 */

import { ScenarioBuilder } from './ScenarioBuilder.js';
import type { SeededUser, SeededPost } from '../types/index.js';
import { LikeBuilder } from '../LikeBuilder.js';
import { CommentBuilder } from '../CommentBuilder.js';
import { FollowBuilder } from '../FollowBuilder.js';

// ============================================================================
// Result Type
// ============================================================================

/**
 * Result of building an active community scenario
 */
export interface ActiveCommunityResult {
  /**
   * All users in the community
   */
  users: SeededUser[];
  
  /**
   * All posts created by users
   */
  posts: SeededPost[];
  
  /**
   * Total number of likes created
   */
  totalLikes: number;
  
  /**
   * Total number of comments created (placeholder)
   */
  totalComments: number;
  
  /**
   * Total number of follow relationships created (placeholder)
   */
  totalFollows: number;
}

// ============================================================================
// ActiveCommunityScenario Class
// ============================================================================

/**
 * Scenario that creates an active community
 * 
 * Creates:
 * - 10 active users (all verified)
 * - 3-7 posts per user (total: 30-70 posts)
 * - Random likes across all posts (5-20 likes per post)
 * - 2-10 comments per post (placeholder)
 * - Complete follow graph - everyone follows everyone (placeholder)
 */
export class ActiveCommunityScenario extends ScenarioBuilder<ActiveCommunityResult> {
  /**
   * Build the active community scenario
   */
  async build(): Promise<ActiveCommunityResult> {
    this.log('Starting ActiveCommunityScenario build');
    
    // Step 1: Create active users
    const userCount = 10;
    this.log(`Creating ${userCount} active users...`);
    
    const users = await this.createUsers(userCount, {
      verified: true,
    });
    
    this.log(`Created ${users.length} users`);
    
    // Step 2: Create posts for each user (3-7 posts per user)
    this.log('Creating posts for all users...');
    
    const posts = await this.createPosts(users, { min: 3, max: 7 });
    
    this.log(`Created ${posts.length} posts`);
    
    // Step 3: Create likes (random distribution: 5-20 likes per post)
    this.log('Creating likes across all posts...');
    
    const totalLikes = await this.createLikes(
      users,
      posts,
      { min: 5, max: 20 }
    );
    
    this.log(`Created ${totalLikes} likes`);
    
    // Step 4: Create comments (2-10 per post)
    this.log('Creating comments across all posts...');
    
    const totalComments = await this.createComments(users, posts, { min: 2, max: 10 });
    
    this.log(`Created ${totalComments} comments`);
    
    // Step 5: Create complete follow graph (everyone follows everyone)
    this.log('Creating complete follow graph (everyone follows everyone)...');
    
    const userIds = users.map(u => u.id);
    const follows = await FollowBuilder.createCompleteGraph(userIds, 10);
    
    const totalFollows = follows.length;
    this.log(`Created ${totalFollows} follow relationships`);
    
    // Step 6: Return results
    const result: ActiveCommunityResult = {
      users,
      posts,
      totalLikes,
      totalComments,
      totalFollows,
    };
    
    this.log('✅ ActiveCommunityScenario complete');
    this.log(`   Users: ${users.length}`);
    this.log(`   Posts: ${posts.length}`);
    this.log(`   Total Likes: ${totalLikes}`);
    this.log(`   Total Comments: ${totalComments}`);
    this.log(`   Total Follows: ${totalFollows}`);
    
    return result;
  }
}
