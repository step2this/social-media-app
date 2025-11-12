import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Home Feed',
};

export default function FeedPage() {
  return (
    <div>
      <h1>Home Feed</h1>
      <p className="info-text">Posts will be loaded from GraphQL in Phase 4.</p>
    </div>
  );
}
