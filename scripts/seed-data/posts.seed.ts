import { faker } from '@faker-js/faker';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { SEED_CONFIG } from '../utils/seed-config.js';
import type { SeededUser } from './users.seed.js';
import {
  generateCaption,
  generateTags,
  generateRecentDate,
  generateImageUrls,
  generateEngagement,
  generateIsPublic
} from '../utils/fake-data-generators.js';

/**
 * Post entity for DynamoDB
 */
interface PostEntity {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  GSI3PK?: string; // For global explore feed (public posts only)
  GSI3SK?: string; // For chronological sorting
  id: string;
  userId: string;
  userHandle: string;
  imageUrl: string;
  thumbnailUrl: string;
  caption?: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  entityType: 'POST';
}

/**
 * Seeded post data (for returning to caller)
 */
export interface SeededPost {
  id: string;
  userId: string;
  userHandle: string;
  caption?: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  isPublic: boolean;
  createdAt: string;
}

/**
 * Seed posts for users
 */
export async function seedPosts(
  dynamoClient: DynamoDBDocumentClient,
  tableName: string,
  users: SeededUser[]
): Promise<SeededPost[]> {
  console.log(`📝 Seeding posts for ${users.length} users...`);

  const seededPosts: SeededPost[] = [];
  let totalPostsCreated = 0;

  for (const user of users) {
    const postCount = faker.number.int({
      min: SEED_CONFIG.postsPerUser.min,
      max: SEED_CONFIG.postsPerUser.max
    });

    for (let i = 0; i < postCount; i++) {
      const postId = randomUUID();
      const caption = Math.random() > 0.2 ? generateCaption() : undefined; // 80% have captions
      const tags = generateTags(faker.number.int({ min: 1, max: 5 }));
      const { imageUrl, thumbnailUrl } = generateImageUrls(postId);
      const { likesCount, commentsCount } = generateEngagement();
      const isPublic = generateIsPublic();
      const createdAt = generateRecentDate().toISOString();

      const entity: PostEntity = {
        PK: `USER#${user.id}`,
        SK: `POST#${createdAt}#${postId}`,
        GSI1PK: `POST#${postId}`,
        GSI1SK: `USER#${user.id}`,
        // GSI3: Global explore feed index (public posts only)
        ...(isPublic && {
          GSI3PK: 'POSTS',
          GSI3SK: `${createdAt}#${postId}`
        }),
        id: postId,
        userId: user.id,
        userHandle: user.handle,
        imageUrl,
        thumbnailUrl,
        caption,
        tags,
        likesCount,
        commentsCount,
        isPublic,
        createdAt,
        updatedAt: createdAt,
        entityType: 'POST'
      };

      try {
        await dynamoClient.send(new PutCommand({
          TableName: tableName,
          Item: entity,
          ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)'
        }));

        seededPosts.push({
          id: postId,
          userId: user.id,
          userHandle: user.handle,
          caption,
          tags,
          likesCount,
          commentsCount,
          isPublic,
          createdAt
        });

        totalPostsCreated++;
      } catch (error) {
        console.error(`  ✗ Failed to create post for @${user.handle}:`, error);
        throw error;
      }
    }

    // Update user's posts count
    try {
      await dynamoClient.send(new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: `USER#${user.id}`,
          SK: 'PROFILE'
        },
        UpdateExpression: 'SET postsCount = :count, updatedAt = :now',
        ExpressionAttributeValues: {
          ':count': postCount,
          ':now': new Date().toISOString()
        }
      }));
    } catch (error) {
      console.error(`  ✗ Failed to update posts count for @${user.handle}:`, error);
    }

    // Log progress
    console.log(`  ✓ Created ${postCount} posts for @${user.handle}`);
  }

  console.log(`✅ Successfully seeded ${totalPostsCreated} posts\n`);
  return seededPosts;
}

/**
 * Display seeded posts summary
 */
export function displayPostsSummary(posts: SeededPost[]): void {
  console.log('📊 Seeded Posts Summary:');
  console.log('─'.repeat(60));

  // Group by user
  const postsByUser = posts.reduce((acc, post) => {
    if (!acc[post.userHandle]) {
      acc[post.userHandle] = [];
    }
    acc[post.userHandle].push(post);
    return acc;
  }, {} as Record<string, SeededPost[]>);

  // Show summary stats
  console.log(`Total Posts: ${posts.length}`);
  console.log(`Users with Posts: ${Object.keys(postsByUser).length}`);
  console.log(`Avg Posts per User: ${(posts.length / Object.keys(postsByUser).length).toFixed(1)}`);
  console.log(`Public Posts: ${posts.filter(p => p.isPublic).length}`);
  console.log(`Total Likes: ${posts.reduce((sum, p) => sum + p.likesCount, 0)}`);
  console.log(`Total Comments: ${posts.reduce((sum, p) => sum + p.commentsCount, 0)}`);

  console.log('\nSample Posts:');
  posts.slice(0, 3).forEach((post, index) => {
    console.log(`${index + 1}. @${post.userHandle}:`);
    console.log(`   Caption: ${post.caption?.slice(0, 50)}${post.caption && post.caption.length > 50 ? '...' : ''}`);
    console.log(`   Tags: ${post.tags.map(t => `#${t}`).join(', ')}`);
    console.log(`   ❤️ ${post.likesCount} | 💬 ${post.commentsCount} | ${post.isPublic ? '🌍 Public' : '🔒 Private'}`);
  });

  console.log('─'.repeat(60) + '\n');
}
