import { faker } from '@faker-js/faker';
import { SEED_CONFIG } from './seed-config.js';

/**
 * Generate a unique username/handle
 */
export function generateHandle(): string {
  const patterns = [
    () => `${faker.person.firstName().toLowerCase()}_${faker.person.lastName().toLowerCase()}`,
    () => `${faker.internet.username().toLowerCase()}`,
    () => `${faker.word.adjective()}${faker.word.noun()}`.toLowerCase(),
    () => `${faker.person.firstName().toLowerCase()}${faker.number.int({ min: 100, max: 999 })}`
  ];

  const pattern = faker.helpers.arrayElement(patterns);
  return pattern().replace(/[^a-z0-9_]/g, '').slice(0, 30);
}

/**
 * Generate a realistic bio for a social media profile
 */
export function generateBio(): string {
  const bioTemplates = [
    () => `${faker.person.jobTitle()} | ${faker.company.catchPhrase()}`,
    () => `${faker.word.adjective()} ${faker.person.jobDescriptor()} 📸 | ${faker.location.city()} ${faker.location.countryCode()}`,
    () => `${faker.company.buzzPhrase()} | ${faker.hacker.phrase()}`,
    () => `${faker.person.jobTitle()} | ${faker.word.adjective()} ${faker.word.noun()} enthusiast`,
    () => `Pet lover ${faker.helpers.arrayElement(['🐶', '🐱', '🐰', '🐦'])} | Adventure seeker ${faker.helpers.arrayElement(['🏔️', '🌊', '🌲', '⛰️'])}`,
    () => `${faker.helpers.arrayElement(['Photographer', 'Artist', 'Creator', 'Designer'])} | Capturing ${faker.word.adjective()} moments`,
    () => `Living ${faker.word.adverb()} | ${faker.company.catchPhrase()}`,
    () => `${faker.location.city()} ${faker.helpers.arrayElement(['based', 'native', 'local'])} | ${faker.person.jobTitle()}`
  ];

  const template = faker.helpers.arrayElement(bioTemplates);
  return template().slice(0, 160); // Max 160 chars
}

/**
 * Generate a realistic post caption
 */
export function generateCaption(): string {
  const captionTemplates = [
    () => faker.lorem.sentence(),
    () => `${faker.word.adjective()} ${faker.word.noun()}! ${faker.helpers.arrayElement(['❤️', '✨', '🌟', '💫', '🎉'])}`,
    () => `${faker.lorem.sentence()} #${faker.word.noun()} #${faker.word.adjective()}`,
    () => `Enjoying ${faker.word.adjective()} ${faker.word.noun()} today ${faker.helpers.arrayElement(['☀️', '🌤️', '⛅', '🌈'])}`,
    () => `${faker.company.catchPhrase()}`,
    () => `${faker.lorem.paragraph().slice(0, 100)}...`,
    () => `${faker.word.adjective()} vibes only ${faker.helpers.arrayElement(['✌️', '🙌', '👌', '💯'])}`,
    () => faker.lorem.sentences(2)
  ];

  const template = faker.helpers.arrayElement(captionTemplates);
  return template().slice(0, 500); // Max 500 chars
}

/**
 * Generate random tags for a post
 */
export function generateTags(count: number = 3): string[] {
  const tags = faker.helpers.arrayElements(
    SEED_CONFIG.commonTags,
    faker.number.int({ min: 1, max: Math.min(count, 5) })
  );
  return tags;
}

/**
 * Generate a random date within the configured time range
 */
export function generateRecentDate(): Date {
  const now = new Date();
  const daysAgo = faker.number.int({ min: 0, max: SEED_CONFIG.createdWithinDays });
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);

  // Add random hours/minutes for more variety
  date.setHours(faker.number.int({ min: 0, max: 23 }));
  date.setMinutes(faker.number.int({ min: 0, max: 59 }));

  return date;
}

/**
 * Generate image URLs using placeholder service
 */
export function generateImageUrls(postId: string): {
  imageUrl: string;
  thumbnailUrl: string;
} {
  const { baseUrl, width, height, thumbWidth, thumbHeight } = SEED_CONFIG.imageService;

  // Use postId-based seed for consistent images per post
  const imageId = faker.number.int({ min: 1, max: 1000 });

  return {
    imageUrl: `${baseUrl}/${width}/${height}?random=${imageId}`,
    thumbnailUrl: `${baseUrl}/${thumbWidth}/${thumbHeight}?random=${imageId}`
  };
}

/**
 * Generate random engagement metrics
 */
export function generateEngagement(): {
  likesCount: number;
  commentsCount: number;
} {
  return {
    likesCount: faker.number.int({
      min: SEED_CONFIG.likesPerPost.min,
      max: SEED_CONFIG.likesPerPost.max
    }),
    commentsCount: faker.number.int({
      min: SEED_CONFIG.commentsPerPost.min,
      max: SEED_CONFIG.commentsPerPost.max
    })
  };
}

/**
 * Generate random isPublic flag
 */
export function generateIsPublic(): boolean {
  return faker.number.int({ min: 1, max: 100 }) <= SEED_CONFIG.publicPostsPercentage;
}

/**
 * Generate a full name
 */
export function generateFullName(): string {
  return faker.person.fullName();
}

/**
 * Generate an email address
 */
export function generateEmail(handle: string): string {
  return `${handle}@example.com`;
}

/**
 * Generate a profile picture URL
 */
export function generateProfilePictureUrl(userId: string): string {
  const avatarId = faker.number.int({ min: 1, max: 70 });
  return `https://i.pravatar.cc/300?img=${avatarId}`;
}

/**
 * Generate follower counts for a user
 */
export function generateFollowerCounts(): {
  followersCount: number;
  followingCount: number;
} {
  return {
    followersCount: faker.number.int({ min: 10, max: 500 }),
    followingCount: faker.number.int({ min: 20, max: 300 })
  };
}
