import { Metadata } from 'next';
import { PostCard } from '@/components/posts/PostCard';
import { getGraphQLClient } from '@/lib/graphql/client';
import { GET_FOLLOWING_FEED } from '@/lib/graphql/queries';
import type { FeedQueryResponse, Post } from '@/lib/graphql/types';
import { logger } from '@/lib/logger';

export const metadata: Metadata = {
  title: 'Home Feed',
};

// Revalidate every 60 seconds
export const revalidate = 60;

export default async function FeedPage() {
  let posts: Post[] = [];
  let error: string | null = null;

  try {
    logger.info('Fetching following feed');

    const client = await getGraphQLClient();
    const data = await client.request<FeedQueryResponse>(GET_FOLLOWING_FEED, {
      first: 20,
    });

    posts = data.followingFeed?.edges.map((edge) => edge.node) || [];

    logger.info({ count: posts.length }, 'Following feed loaded');
  } catch (err) {
    logger.error({ error: err }, 'Failed to fetch following feed');
    error = err instanceof Error ? err.message : 'Failed to load feed';
  }

  return (
    <div>
      <h1 className="page-title">Home Feed</h1>

      {error && (
        <div className="info-banner" style={{ background: '#fee', color: '#c00' }}>
          Error: {error}. Make sure the GraphQL server is running on port 4000 and you&apos;re authenticated.
        </div>
      )}

      {!error && posts.length === 0 && (
        <div className="info-banner">
          No posts yet! Follow some users or check out the Explore page to discover content.
        </div>
      )}

      {posts.length > 0 && (
        <>
          <div className="info-banner">
            Phase 4: Loading posts from GraphQL server! ({posts.length} posts loaded)
          </div>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </>
      )}
    </div>
  );
}
