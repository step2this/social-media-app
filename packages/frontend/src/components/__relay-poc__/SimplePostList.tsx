/**
 * Simple Post List - Relay Proof of Concept
 *
 * This component demonstrates that the Relay setup is working correctly.
 * It fetches a simple list of posts from the explore feed.
 *
 * TDD Note: This is a POC component - will write tests once we verify it works
 */

import { useLazyLoadQuery, graphql } from 'react-relay';
import type { SimplePostListQuery as SimplePostListQueryType } from './__generated__/SimplePostListQuery.graphql';

/**
 * Simple query to fetch explore feed posts
 *
 * This demonstrates:
 * - Relay query syntax
 * - Connection/Edge pattern (already in use)
 * - Type generation
 */
const SimplePostListQuery = graphql`
  query SimplePostListQuery {
    exploreFeed(limit: 5) {
      edges {
        node {
          id
          caption
          likesCount
          commentsCount
          author {
            handle
            username
          }
        }
      }
    }
  }
`;

/**
 * SimplePostList Component
 *
 * Proof of concept showing Relay in action.
 * Once this works, we know the entire Relay pipeline is functional:
 * - Relay Environment ✓
 * - Network layer ✓
 * - Schema ✓
 * - Compiler ✓
 * - Type generation ✓
 */
export function SimplePostList(): JSX.Element {
  const data = useLazyLoadQuery<SimplePostListQueryType>(
    SimplePostListQuery,
    {}
  );

  return (
    <div style={{ padding: '20px', border: '2px solid #4CAF50', borderRadius: '8px', margin: '20px' }}>
      <h3 style={{ color: '#4CAF50' }}>🎉 Relay Proof of Concept - Working!</h3>
      <p style={{ fontSize: '14px', color: '#666' }}>
        This component uses Relay to fetch data. If you see posts below, the entire Relay setup is working!
      </p>

      <div style={{ marginTop: '20px' }}>
        {data.exploreFeed.edges.length === 0 ? (
          <p>No posts found (database might be empty)</p>
        ) : (
          data.exploreFeed.edges.map((edge) => (
            <div
              key={edge.node.id}
              style={{
                padding: '15px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                marginBottom: '10px',
                backgroundColor: '#f9f9f9'
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                @{edge.node.author.handle}
                {edge.node.author.username && ` (${edge.node.author.username})`}
              </div>

              {edge.node.caption && (
                <p style={{ margin: '8px 0', color: '#333' }}>
                  {edge.node.caption}
                </p>
              )}

              <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                ❤️ {edge.node.likesCount} likes • 💬 {edge.node.commentsCount} comments
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
