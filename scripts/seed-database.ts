#!/usr/bin/env tsx

/**
 * Database Seeding Script for TamaFriends Social Media App
 *
 * This script populates the DynamoDB database with realistic test data
 * for development and testing purposes.
 *
 * Usage:
 *   pnpm seed:local              # Seed LocalStack database
 *   pnpm seed:local:fresh        # Reset and seed fresh data
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { faker } from '@faker-js/faker';
import { SEED_CONFIG } from './utils/seed-config.js';
import { seedUsers, displayUsersSummary } from './seed-data/users.seed.js';
import { seedPosts, displayPostsSummary } from './seed-data/posts.seed.js';

/**
 * Initialize DynamoDB client for LocalStack
 */
function createDynamoDBClient(): DynamoDBDocumentClient {
  const isLocalStack = process.env.USE_LOCALSTACK === 'true' ||
                       process.env.NODE_ENV === 'development' ||
                       process.env.NODE_ENV === 'test';

  const dynamoConfig: any = {
    region: process.env.AWS_REGION || 'us-east-1'
  };

  if (isLocalStack) {
    dynamoConfig.endpoint = process.env.LOCALSTACK_ENDPOINT || 'http://localhost:4566';
    console.log('🔧 Using LocalStack endpoint:', dynamoConfig.endpoint);
  } else {
    console.log('☁️  Using AWS DynamoDB');
  }

  // Add credentials for LocalStack
  if (isLocalStack) {
    dynamoConfig.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test'
    };
  }

  const client = new DynamoDBClient(dynamoConfig);
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
      convertClassInstanceToMap: true
    }
  });
}

/**
 * Get table name from environment
 */
function getTableName(): string {
  const tableName = process.env.TABLE_NAME || 'tamafriends-local';
  console.log('📋 Using table:', tableName);
  return tableName;
}

/**
 * Main seeding function
 */
async function seedDatabase(): Promise<void> {
  console.log('\n🌱 TamaFriends Database Seeding');
  console.log('═'.repeat(60));
  console.log(`Faker Seed: ${SEED_CONFIG.fakerSeed || 'random'}`);
  console.log(`Users to Create: ${SEED_CONFIG.usersCount}`);
  console.log(`Posts per User: ${SEED_CONFIG.postsPerUser.min}-${SEED_CONFIG.postsPerUser.max}`);
  console.log('═'.repeat(60) + '\n');

  // Set faker seed for reproducible data
  if (SEED_CONFIG.fakerSeed) {
    faker.seed(SEED_CONFIG.fakerSeed);
  }

  // Initialize DynamoDB client
  const dynamoClient = createDynamoDBClient();
  const tableName = getTableName();

  const startTime = Date.now();

  try {
    // Step 1: Seed Users
    console.log('📍 Step 1: Seeding Users');
    console.log('─'.repeat(60));
    const users = await seedUsers(dynamoClient, tableName, SEED_CONFIG.usersCount);
    displayUsersSummary(users);

    // Step 2: Seed Posts
    console.log('📍 Step 2: Seeding Posts');
    console.log('─'.repeat(60));
    const posts = await seedPosts(dynamoClient, tableName, users);
    displayPostsSummary(posts);

    // Success summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('✨ Seeding Complete!');
    console.log('═'.repeat(60));
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`👥 Users Created: ${users.length}`);
    console.log(`📸 Posts Created: ${posts.length}`);
    console.log(`📊 Avg Posts/User: ${(posts.length / users.length).toFixed(1)}`);
    console.log('═'.repeat(60));

    console.log('\n💡 Next Steps:');
    console.log('  1. Start your dev servers: pnpm dev');
    console.log('  2. Visit http://localhost:3000');
    console.log('  3. Browse posts and profiles with test data!');
    console.log('\n✅ Database seeded successfully!\n');

  } catch (error) {
    console.error('\n❌ Seeding Failed!');
    console.error('═'.repeat(60));
    console.error('Error:', error);
    console.error('═'.repeat(60));

    if (error instanceof Error) {
      console.error('\nError Details:');
      console.error(`  Message: ${error.message}`);
      console.error(`  Stack: ${error.stack?.split('\n').slice(0, 5).join('\n')}`);
    }

    console.error('\n💡 Troubleshooting:');
    console.error('  1. Ensure LocalStack is running: pnpm local:status');
    console.error('  2. Ensure table exists: aws dynamodb describe-table --table-name tamafriends-local');
    console.error('  3. Check environment variables: USE_LOCALSTACK, TABLE_NAME');
    console.error('  4. Try: pnpm reset && pnpm dev:localstack');

    process.exit(1);
  }
}

/**
 * Run the seeding script
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  // Check environment
  if (!process.env.TABLE_NAME && !process.env.USE_LOCALSTACK) {
    console.warn('⚠️  Warning: No TABLE_NAME or USE_LOCALSTACK environment variable set');
    console.warn('   Using defaults: TABLE_NAME=tamafriends-local, USE_LOCALSTACK=true');
    process.env.USE_LOCALSTACK = 'true';
    process.env.TABLE_NAME = 'tamafriends-local';
  }

  seedDatabase().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { seedDatabase };
