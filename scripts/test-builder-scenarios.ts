#!/usr/bin/env tsx

/**
 * Test Runner for Builder Scenarios
 *
 * Runs test scenarios to validate the Test Data Builder System.
 * Executes scenarios and displays results with statistics.
 */

// Load environment variables first (before any other imports)
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
config({ path: resolve(__dirname, '../.env') });

// Now import the builders from the package
import { PopularPostScenario, ActiveCommunityScenario } from '@social-media-app/test-data-builders';

async function main() {
  console.log('🚀 Test Data Builder System - Scenario Test Runner\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: PopularPostScenario
    console.log('\n📊 Test 1: Popular Post Scenario');
    console.log('-'.repeat(60));

    const popularScenario = new PopularPostScenario();
    const popularResult = await popularScenario.build();

    console.log('\n✅ Popular Post Scenario Results:');
    console.log(`   📱 Influencer: @${popularResult.influencer.handle}`);
    console.log(`   📧 Email: ${popularResult.influencer.email}`);
    console.log(`   📝 Post ID: ${popularResult.post.id}`);
    console.log(`   👥 Engagers: ${popularResult.engagers.length}`);
    console.log(`   ❤️  Total Likes: ${popularResult.totalLikes}`);
    console.log(`   💬 Total Comments: ${popularResult.totalComments}`);
    console.log(`   📈 Total Engagement: ${popularResult.totalLikes + popularResult.totalComments}`);

    // Test 2: ActiveCommunityScenario
    console.log('\n\n📊 Test 2: Active Community Scenario');
    console.log('-'.repeat(60));

    const communityScenario = new ActiveCommunityScenario();
    const communityResult = await communityScenario.build();

    console.log('\n✅ Active Community Scenario Results:');
    console.log(`   👥 Users: ${communityResult.users.length}`);
    console.log(`   📝 Posts: ${communityResult.posts.length}`);
    console.log(`   ❤️  Total Likes: ${communityResult.totalLikes}`);
    console.log(`   💬 Total Comments: ${communityResult.totalComments}`);
    console.log(`   🔗 Total Follows: ${communityResult.totalFollows}`);
    console.log(`   📊 Avg Posts/User: ${(communityResult.posts.length / communityResult.users.length).toFixed(1)}`);
    console.log(`   📈 Total Engagement: ${communityResult.totalLikes + communityResult.totalComments + communityResult.totalFollows}`);

    // Summary
    console.log('\n\n' + '='.repeat(60));
    console.log('📋 Summary');
    console.log('='.repeat(60));

    const totalUsers = 1 + popularResult.engagers.length + communityResult.users.length;
    const totalPosts = 1 + communityResult.posts.length;
    const totalLikes = popularResult.totalLikes + communityResult.totalLikes;
    const totalComments = popularResult.totalComments + communityResult.totalComments;
    const totalFollows = communityResult.totalFollows;

    console.log(`✅ Total Users Created: ${totalUsers}`);
    console.log(`✅ Total Posts Created: ${totalPosts}`);
    console.log(`✅ Total Likes Created: ${totalLikes}`);
    console.log(`✅ Total Comments Created: ${totalComments}`);
    console.log(`✅ Total Follows Created: ${totalFollows}`);
    console.log(`✅ Total Entities: ${totalUsers + totalPosts + totalLikes + totalComments + totalFollows}`);

    console.log('\n🎉 All scenarios completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Error running scenarios:', error);
    console.error(error);
    process.exit(1);
  }
}

main();
