/**
 * PopularPostScenario - Creates an influencer with a viral post
 * 
 * This scenario creates a realistic influencer account with a highly
 * engaging viral post that has significant engagement (100-500 likes,
 * 20-50 comments). Useful for testing trending content, notifications,
 * and high-engagement features.
 * 
 * @example
 * ```typescript
 * const scenario = await new PopularPostScenario().build();
 * 
 * console.log(`Influencer: @${scenario.influencer.handle}`);
 * console.log(`Viral post: ${scenario.post.id}`);
 * console.log(`Total engagement: ${scenario.totalLikes + scenario.totalComments}`);
 * ```
 */

import { ScenarioBuilder } from './ScenarioBuilder.js';
import type { SeededUser, SeededPost } from '../types/index.js';
import { UserBuilder } from '../UserBuilder.js';
import { PostBuilder } from '../PostBuilder.js';
import { LikeBuilder } from '../LikeBuilder.js';
import { CommentBuilder } from '../CommentBuilder.js';

// ============================================================================
// Result Type
// ============================================================================

/**
 * Result of building a popular post scenario
 */
export interface PopularPostResult {
  /**
   * The influencer who created the viral post
   */
  influencer: SeededUser;
  
  /**
   * The viral post with high engagement
   */
  post: SeededPost;
  
  /**
   * Users who engaged with the post (liked it)
   */
  engagers: SeededUser[];
  
  /**
   * Total number of likes created
   */
  totalLikes: number;
  
  /**
   * Total number of comments created (placeholder for Phase 3.3)
   */
  totalComments: number;
}

// ============================================================================
// PopularPostScenario Class
// ============================================================================

/**
 * Scenario that creates an influencer with a viral post
 * 
 * Creates:
 * - 1 influencer with high follower count
 * - 1 viral post by the influencer
 * - 50-100 regular users
 * - 100-500 likes on the viral post
 * - 20-50 comments (placeholder for when CommentBuilder is implemented)
 */
export class PopularPostScenario extends ScenarioBuilder<PopularPostResult> {
  /**
   * Build the popular post scenario
   */
  async build(): Promise<PopularPostResult> {
    this.log('Starting PopularPostScenario build');
    
    // Step 1: Create the influencer
    this.log('Creating influencer...');
    const influencer = await new UserBuilder()
      .asInfluencer()
      .verified(true)
      .build();
    
    this.log(`Created influencer: @${influencer.handle} with ${influencer.followersCount} followers`);
    
    // Step 2: Create the viral post
    this.log('Creating viral post...');
    const post = await new PostBuilder()
      .byUser(influencer.id, influencer.handle)
      .viral()
      .build();
    
    this.log(`Created viral post: ${post.id}`);
    
    // Step 3: Create users who will engage with the post
    const engagerCount = Math.floor(Math.random() * 51) + 50; // 50-100 users
    this.log(`Creating ${engagerCount} users to engage with the post...`);
    
    const engagers = await this.createUsers(engagerCount, {
      verified: true,
    });
    
    this.log(`Created ${engagers.length} engager users`);
    
    // Step 4: Create likes on the viral post
    const likesCount = Math.floor(Math.random() * 401) + 100; // 100-500 likes
    this.log(`Creating ${likesCount} likes on the viral post...`);
    
    // Randomly select users from engagers to like the post
    const likers = this.randomSubset(engagers, likesCount);
    
    await LikeBuilder.createMany(
      likers.map(u => u.id),
      post.id,
      10 // Concurrency: 10 likes at a time
    );
    
    this.log(`Created ${likesCount} likes on post ${post.id}`);
    
    // Step 5: Create comments on the viral post
    const commentsCount = Math.floor(Math.random() * 31) + 20; // 20-50 comments
    this.log(`Creating ${commentsCount} comments on the viral post...`);
    
    // Randomly select users from engagers to comment
    const commenters = this.randomSubset(engagers, commentsCount);
    
    await CommentBuilder.createMany(
      commenters.map(u => ({ userId: u.id, handle: u.handle })),
      post.id,
      5 // Concurrency: 5 comments at a time
    );
    
    this.log(`Created ${commentsCount} comments on post ${post.id}`);
    
    // Step 6: Return results
    const result: PopularPostResult = {
      influencer,
      post,
      engagers,
      totalLikes: likesCount,
      totalComments: commentsCount,
    };
    
    this.log('✅ PopularPostScenario complete');
    this.log(`   Influencer: @${influencer.handle}`);
    this.log(`   Viral Post: ${post.id}`);
    this.log(`   Engagers: ${engagers.length}`);
    this.log(`   Total Likes: ${likesCount}`);
    this.log(`   Total Comments: ${commentsCount}`);
    
    return result;
  }
}
