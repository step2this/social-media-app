import { Metadata } from 'next';
import { PostCard } from '@/components/posts/PostCard';
import { getGraphQLClient } from '@/lib/graphql/client';
import { GET_EXPLORE_FEED } from '@/lib/graphql/queries';
import type { FeedQueryResponse, Post } from '@/lib/graphql/types';
import { logger } from '@/lib/logger';

export const metadata: Metadata = {
  title: 'Explore',
};

// Revalidate every 30 seconds to show fresh content
export const revalidate = 30;

export default async function ExplorePage() {
  let posts: Post[] = [];
  let error: string | null = null;

  try {
    logger.info('Fetching explore feed');

    const client = await getGraphQLClient();
    const data = await client.request<FeedQueryResponse>(GET_EXPLORE_FEED, {
      first: 20,
    });

    posts = data.exploreFeed?.edges.map((edge) => edge.node) || [];

    logger.info({
      count: posts.length,
      samplePost: posts[0] ? {
        id: posts[0].id,
        likesCount: posts[0].likesCount,
        isLiked: posts[0].isLiked
      } : null
    }, 'Explore feed loaded');
  } catch (err) {
    logger.error({ error: err }, 'Failed to fetch explore feed');
    error = err instanceof Error ? err.message : 'Failed to load posts';
  }

  return (
    <div>
      <h1 className="page-title">Explore</h1>

      {error && (
        <div className="info-banner" style={{ background: '#fee', color: '#c00' }}>
          Error: {error}. Make sure the GraphQL server is running on port 4000.
        </div>
      )}

      {!error && posts.length === 0 && (
        <div className="info-banner">
          No posts yet! Use the seed script to add some test data.
        </div>
      )}

      {posts.length > 0 && (
        <>
          <div className="info-banner">
            Showing all posts ({posts.length} loaded). Try liking some posts!
          </div>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </>
      )}
    </div>
  );
}
