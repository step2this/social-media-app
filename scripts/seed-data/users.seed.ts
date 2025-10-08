import { faker } from '@faker-js/faker';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { SEED_CONFIG } from '../utils/seed-config.js';
import {
  generateHandle,
  generateBio,
  generateFullName,
  generateEmail,
  generateProfilePictureUrl,
  generateFollowerCounts
} from '../utils/fake-data-generators.js';

/**
 * User profile entity for DynamoDB
 */
interface UserProfileEntity {
  PK: string;
  SK: string;
  GSI3PK: string;
  GSI3SK: string;
  id: string;
  email: string;
  username: string;
  handle: string;
  fullName?: string;
  bio?: string;
  profilePictureUrl?: string;
  profilePictureThumbnailUrl?: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  entityType: 'PROFILE';
}

/**
 * Seeded user data (for returning to caller)
 */
export interface SeededUser {
  id: string;
  email: string;
  username: string;
  handle: string;
  fullName?: string;
  bio?: string;
  profilePictureUrl?: string;
}

/**
 * Seed users into DynamoDB
 */
export async function seedUsers(
  dynamoClient: DynamoDBDocumentClient,
  tableName: string,
  count: number = SEED_CONFIG.usersCount
): Promise<SeededUser[]> {
  console.log(`📝 Seeding ${count} users...`);

  const seededUsers: SeededUser[] = [];
  const usedHandles = new Set<string>();

  for (let i = 0; i < count; i++) {
    // Generate unique handle
    let handle = generateHandle();
    let attempts = 0;
    while (usedHandles.has(handle) && attempts < 10) {
      handle = generateHandle();
      attempts++;
    }
    usedHandles.add(handle);

    const userId = randomUUID();
    const fullName = generateFullName();
    const email = generateEmail(handle);
    const bio = generateBio();
    const profilePictureUrl = generateProfilePictureUrl(userId);
    const { followersCount, followingCount } = generateFollowerCounts();
    const now = new Date().toISOString();

    const entity: UserProfileEntity = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      GSI3PK: `HANDLE#${handle.toLowerCase()}`,
      GSI3SK: `USER#${userId}`,
      id: userId,
      email,
      username: handle, // In your system, username and handle are the same
      handle,
      fullName,
      bio,
      profilePictureUrl,
      profilePictureThumbnailUrl: profilePictureUrl, // Use same for simplicity
      postsCount: 0, // Will be incremented as posts are created
      followersCount,
      followingCount,
      emailVerified: true, // All seed users are verified
      createdAt: now,
      updatedAt: now,
      entityType: 'PROFILE'
    };

    try {
      await dynamoClient.send(new PutCommand({
        TableName: tableName,
        Item: entity,
        ConditionExpression: 'attribute_not_exists(PK)'
      }));

      seededUsers.push({
        id: userId,
        email,
        username: handle,
        handle,
        fullName,
        bio,
        profilePictureUrl
      });

      // Log progress every 5 users
      if ((i + 1) % 5 === 0 || (i + 1) === count) {
        console.log(`  ✓ Created ${i + 1}/${count} users`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to create user ${handle}:`, error);
      throw error;
    }
  }

  console.log(`✅ Successfully seeded ${seededUsers.length} users\n`);
  return seededUsers;
}

/**
 * Display seeded users summary
 */
export function displayUsersSummary(users: SeededUser[]): void {
  console.log('📊 Seeded Users Summary:');
  console.log('─'.repeat(60));

  users.slice(0, 5).forEach((user, index) => {
    console.log(`${index + 1}. @${user.handle} (${user.fullName})`);
    console.log(`   Bio: ${user.bio?.slice(0, 50)}${user.bio && user.bio.length > 50 ? '...' : ''}`);
  });

  if (users.length > 5) {
    console.log(`... and ${users.length - 5} more users`);
  }

  console.log('─'.repeat(60) + '\n');
}
