import { Metadata } from 'next';
import { PostCard } from '@/components/posts/PostCard';

export const metadata: Metadata = {
  title: 'Home Feed',
};

// Sample data - will be replaced with GraphQL in Phase 4
const samplePosts = [
  {
    id: '1',
    author: {
      username: 'John Doe',
      handle: 'johndoe',
      avatar: '/default-avatar.png',
    },
    caption: 'Just finished building an amazing Next.js app! 🚀',
    imageUrl: undefined,
    likesCount: 42,
    commentsCount: 7,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    author: {
      username: 'Jane Smith',
      handle: 'janesmith',
      avatar: '/default-avatar.png',
    },
    caption: 'Beautiful sunset today 🌅',
    imageUrl: undefined,
    likesCount: 128,
    commentsCount: 15,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '3',
    author: {
      username: 'Mike Johnson',
      handle: 'mikej',
      avatar: '/default-avatar.png',
    },
    caption: 'Working on some exciting features! Stay tuned 👀',
    imageUrl: undefined,
    likesCount: 56,
    commentsCount: 9,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

export default function FeedPage() {
  return (
    <div>
      <h1 className="page-title">Home Feed</h1>
      <div className="info-banner">
        Phase 3: Layout and components are functional. Posts will load from GraphQL in Phase 4.
      </div>

      {samplePosts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
