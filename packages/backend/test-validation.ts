import { FeedEventSchema } from '@social-media-app/shared';

const testEvent = {
  eventId: '550e8400-e29b-41d4-a716-446655440001',
  eventType: 'POST_CREATED',
  timestamp: '2025-01-13T10:00:00Z',
  version: '1.0',
  postId: '550e8400-e29b-41d4-a716-446655440002',
  authorId: '550e8400-e29b-41d4-a716-446655440003',
  authorHandle: 'johndoe',
  caption: 'Test post',
  imageUrl: 'https://example.com/image.jpg',
  isPublic: true,
  createdAt: '2025-01-13T10:00:00Z'
};

const result = FeedEventSchema.safeParse(testEvent);
if (!result.success) {
  console.error('Validation failed:', result.error.format());
} else {
  console.log('Validation succeeded!');
}