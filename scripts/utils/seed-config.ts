/**
 * Seeding configuration for database population
 */
export const SEED_CONFIG = {
  // Number of test users to create
  usersCount: 15,

  // Posts per user range (min-max)
  postsPerUser: {
    min: 3,
    max: 8
  },

  // Engagement metrics ranges
  likesPerPost: {
    min: 0,
    max: 50
  },
  commentsPerPost: {
    min: 0,
    max: 20
  },

  // Time range for created dates (days ago)
  createdWithinDays: 30,

  // Faker seed for reproducible data (optional)
  // Set to null for random data each time
  fakerSeed: 123,

  // Image placeholder service
  imageService: {
    baseUrl: 'https://picsum.photos', // Lorem Picsum for random images
    width: 800,
    height: 800,
    thumbWidth: 300,
    thumbHeight: 300
  },

  // Common post tags for variety
  commonTags: [
    'pets',
    'cute',
    'adventure',
    'travel',
    'food',
    'photography',
    'nature',
    'sunset',
    'friends',
    'family',
    'art',
    'music',
    'fitness',
    'lifestyle',
    'fun',
    'happy',
    'love',
    'instagood',
    'beautiful',
    'amazing'
  ],

  // Percentage of posts that are public
  publicPostsPercentage: 85
} as const;

export type SeedConfig = typeof SEED_CONFIG;
