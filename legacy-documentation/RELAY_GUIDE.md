# Relay Developer Guide

## Overview

This project uses **Relay Modern** for all GraphQL data fetching. Relay provides:

- **Automatic cache normalization** - Updates propagate automatically across components
- **Optimistic updates** - Instant UI feedback before server response
- **Type safety** - Auto-generated TypeScript types from GraphQL queries
- **Declarative data** - Components declare their data requirements
- **Efficient fetching** - Automatic query deduplication and batching

## Quick Start

### Running Relay Compiler

The Relay compiler generates TypeScript types from your GraphQL queries:

```bash
# Compile once
npm run relay

# Watch mode (recommended during development)
npm run relay:watch
```

**Important**: Always run the compiler after writing new queries/mutations/fragments!

## Core Concepts

### 1. Queries - Fetching Data

Use `useLazyLoadQuery` to fetch data at the component level:

```typescript
import { useLazyLoadQuery, graphql } from 'react-relay';
import type { MyComponentQuery } from './__generated__/MyComponentQuery.graphql';

function MyComponent() {
  const data = useLazyLoadQuery<MyComponentQuery>(
    graphql`
      query MyComponentQuery {
        me {
          id
          username
          email
        }
      }
    `,
    {}, // variables
    { fetchPolicy: 'store-or-network' } // options
  );

  return <div>Hello {data.me.username}!</div>;
}
```

**Fetch Policies**:
- `store-or-network` (default) - Use cached data if available, otherwise fetch
- `network-only` - Always fetch from network
- `store-only` - Only use cached data, never fetch

### 2. Fragments - Component Data Requirements

Use `useFragment` to declare component data requirements:

```typescript
import { useFragment, graphql } from 'react-relay';
import type { PostCard_post$key } from './__generated__/PostCard_post.graphql';

interface Props {
  post: PostCard_post$key; // Opaque fragment reference
}

function PostCard({ post: postRef }: Props) {
  const post = useFragment(
    graphql`
      fragment PostCard_post on Post {
        id
        caption
        imageUrl
        likesCount
        isLiked
        author {
          handle
          username
        }
      }
    `,
    postRef
  );

  return (
    <div>
      <img src={post.imageUrl} alt={post.caption} />
      <p>{post.caption}</p>
      <span>❤️ {post.likesCount}</span>
    </div>
  );
}
```

**Why fragments?**
- **Colocation** - Data requirements live with components
- **Type safety** - TypeScript knows exactly what fields are available
- **Composability** - Parent components can spread child fragments
- **Optimization** - Relay can optimize query structure

### 3. Mutations - Modifying Data

Use `useMutation` for creating/updating/deleting data:

```typescript
import { useMutation, graphql } from 'react-relay';
import type { PostCardLikeMutation } from './__generated__/PostCardLikeMutation.graphql';

function PostCard({ post }: Props) {
  const [commitLike, isLikeInFlight] = useMutation<PostCardLikeMutation>(
    graphql`
      mutation PostCardLikeMutation($postId: ID!) {
        likePost(postId: $postId) {
          success
          likesCount
          isLiked
        }
      }
    `
  );

  const handleLike = () => {
    commitLike({
      variables: { postId: post.id },
      
      // Optimistic response - Update UI immediately
      optimisticResponse: {
        likePost: {
          success: true,
          likesCount: post.likesCount + 1,
          isLiked: true,
        },
      },
      
      // Optimistic updater - Modify cache immediately
      optimisticUpdater: (store) => {
        const postRecord = store.get(post.id);
        if (postRecord) {
          postRecord.setValue(true, 'isLiked');
          postRecord.setValue(post.likesCount + 1, 'likesCount');
        }
      },
      
      // Success callback
      onCompleted: (response) => {
        if (!response.likePost?.success) {
          console.error('Like failed');
        }
      },
      
      // Error callback
      onError: (error) => {
        console.error('Error liking post:', error);
      },
    });
  };

  return (
    <button onClick={handleLike} disabled={isLikeInFlight}>
      {post.isLiked ? '❤️' : '🤍'} {post.likesCount}
    </button>
  );
}
```

### 4. Pagination - Loading More Data

Use `usePaginationFragment` for cursor-based pagination:

```typescript
import { usePaginationFragment, graphql } from 'react-relay';

function FeedList({ query }: { query: FeedList_query$key }) {
  const { data, loadNext, hasNext, isLoadingNext } = usePaginationFragment(
    graphql`
      fragment FeedList_query on Query 
      @refetchable(queryName: "FeedListPaginationQuery") {
        posts(first: $count, after: $cursor) 
        @connection(key: "FeedList_posts") {
          edges {
            node {
              id
              ...PostCard_post
            }
          }
        }
      }
    `,
    query
  );

  const handleLoadMore = () => {
    if (hasNext && !isLoadingNext) {
      loadNext(20); // Load 20 more items
    }
  };

  return (
    <div>
      {data.posts.edges.map(edge => (
        <PostCard key={edge.node.id} post={edge.node} />
      ))}
      {hasNext && (
        <button onClick={handleLoadMore} disabled={isLoadingNext}>
          {isLoadingNext ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

**Key directives**:
- `@refetchable` - Makes fragment refetchable for pagination
- `@connection` - Marks paginated field for automatic cache updates

### 5. Suspense Boundaries

Relay queries suspend while loading. Wrap components in Suspense:

```typescript
import { Suspense } from 'react';
import { LoadingSpinner } from './components/LoadingSpinner';

function MyPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MyPageContent />
    </Suspense>
  );
}
```

## Project Patterns

### Component Structure

```
PostCard.relay.tsx          # Component with Relay hooks
PostCard.css               # Styles
PostCard.relay.test.tsx    # Tests with Relay test utils
__generated__/
  PostCard_post.graphql.ts       # Fragment types
  PostCardLikeMutation.graphql.ts # Mutation types
```

### Naming Conventions

- **Queries**: `{ComponentName}Query`
- **Mutations**: `{ComponentName}{Action}Mutation`
- **Fragments**: `{ComponentName}_{field}`
- **Files**: `{ComponentName}.relay.tsx` for Relay components

### Example: Full Component

```typescript
// PostCard.relay.tsx
import { useState } from 'react';
import { useFragment, useMutation, graphql } from 'react-relay';
import type { PostCard_post$key } from './__generated__/PostCard_post.graphql';
import type { PostCardLikeMutation } from './__generated__/PostCardLikeMutation.graphql';

interface Props {
  post: PostCard_post$key;
}

export function PostCardRelay({ post: postRef }: Props) {
  const post = useFragment(
    graphql`
      fragment PostCard_post on Post {
        id
        caption
        imageUrl
        likesCount
        isLiked
        author {
          handle
          username
        }
      }
    `,
    postRef
  );

  const [commitLike, isLoading] = useMutation<PostCardLikeMutation>(
    graphql`
      mutation PostCardLikeMutation($postId: ID!) {
        likePost(postId: $postId) {
          success
          likesCount
          isLiked
        }
      }
    `
  );

  const handleLike = () => {
    commitLike({
      variables: { postId: post.id },
      optimisticResponse: {
        likePost: {
          success: true,
          likesCount: post.likesCount + 1,
          isLiked: true,
        },
      },
      optimisticUpdater: (store) => {
        const record = store.get(post.id);
        if (record) {
          record.setValue(true, 'isLiked');
          record.setValue(post.likesCount + 1, 'likesCount');
        }
      },
    });
  };

  return (
    <article>
      <img src={post.imageUrl} alt={post.caption} />
      <p>{post.caption}</p>
      <button onClick={handleLike} disabled={isLoading}>
        {post.isLiked ? '❤️' : '🤍'} {post.likesCount}
      </button>
    </article>
  );
}
```

## Testing with Relay

### Setup

```typescript
import { createMockEnvironment, MockPayloadGenerator } from 'relay-test-utils';
import { RelayEnvironmentProvider } from 'react-relay';
import { render } from '@testing-library/react';

describe('PostCard', () => {
  let environment;

  beforeEach(() => {
    environment = createMockEnvironment();
  });

  it('renders post data', () => {
    const { getByText } = render(
      <RelayEnvironmentProvider environment={environment}>
        <PostCard post={mockPostRef} />
      </RelayEnvironmentProvider>
    );

    expect(getByText('Test caption')).toBeInTheDocument();
  });
});
```

### Resolving Queries

```typescript
it('loads and displays posts', () => {
  const { getByText } = render(
    <RelayEnvironmentProvider environment={environment}>
      <HomePage />
    </RelayEnvironmentProvider>
  );

  // Resolve the query
  environment.mock.resolveMostRecentOperation(operation =>
    MockPayloadGenerator.generate(operation, {
      Post() {
        return {
          id: 'post-1',
          caption: 'Hello world',
          likesCount: 10,
        };
      },
    })
  );

  expect(getByText('Hello world')).toBeInTheDocument();
});
```

### Testing Mutations

```typescript
it('handles like mutation', () => {
  const { getByRole } = render(
    <RelayEnvironmentProvider environment={environment}>
      <PostCard post={mockPostRef} />
    </RelayEnvironmentProvider>
  );

  fireEvent.click(getByRole('button', { name: /like/i }));

  // Verify mutation was called
  expect(
    environment.mock.getMostRecentOperation().request.node.operation.name
  ).toBe('PostCardLikeMutation');

  // Resolve mutation
  environment.mock.resolveMostRecentOperation(operation =>
    MockPayloadGenerator.generate(operation)
  );
});
```

## Relay Environment

### Configuration

The Relay environment is configured in `/Users/shaperosteve/social-media-app/packages/frontend/src/relay/RelayEnvironment.ts`:

```typescript
import { Environment, Network, RecordSource, Store } from 'relay-runtime';

function fetchQuery(operation, variables) {
  return fetch('http://localhost:4000/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: JSON.stringify({
      query: operation.text,
      variables,
    }),
  }).then(response => response.json());
}

export const relayEnvironment = new Environment({
  network: Network.create(fetchQuery),
  store: new Store(new RecordSource()),
});
```

### Provider Setup

Wrap your app in `RelayEnvironmentProvider`:

```typescript
import { RelayEnvironmentProvider } from 'react-relay';
import { relayEnvironment } from './relay/RelayEnvironment';

function App() {
  return (
    <RelayEnvironmentProvider environment={relayEnvironment}>
      <YourApp />
    </RelayEnvironmentProvider>
  );
}
```

## Migration from Legacy Services

### Before (Legacy Service)

```typescript
// ❌ OLD: Manual state management, imperative calls
function PostCard({ post }: Props) {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);

  const handleLike = async () => {
    try {
      const result = await likeService.likePost(post.id);
      setIsLiked(result.isLiked);
      setLikesCount(result.likesCount);
    } catch (error) {
      console.error('Failed to like post');
    }
  };

  return <button onClick={handleLike}>❤️ {likesCount}</button>;
}
```

### After (Relay)

```typescript
// ✅ NEW: Declarative data, automatic cache updates
function PostCardRelay({ post: postRef }: Props) {
  const post = useFragment(graphql`...`, postRef);
  const [commitLike] = useMutation(graphql`...`);

  const handleLike = () => {
    commitLike({
      variables: { postId: post.id },
      optimisticUpdater: (store) => {
        // Automatic cache update
        const record = store.get(post.id);
        record?.setValue(true, 'isLiked');
      },
    });
  };

  return <button onClick={handleLike}>❤️ {post.likesCount}</button>;
}
```

**Benefits**:
- ✅ No manual state management
- ✅ Automatic UI updates across all components
- ✅ Optimistic updates for instant feedback
- ✅ Type safety with generated types
- ✅ Simpler, more maintainable code

## Common Patterns

### Pattern 1: Conditional Rendering

```typescript
const data = useFragment(
  graphql`
    fragment PostCard_post on Post {
      id
      caption
      author {
        handle
        profilePictureUrl
      }
    }
  `,
  postRef
);

return (
  <div>
    {data.author.profilePictureUrl && (
      <img src={data.author.profilePictureUrl} alt={data.author.handle} />
    )}
  </div>
);
```

### Pattern 2: Fragment Spreading

Parent component spreads child fragment:

```typescript
// Parent
const data = useLazyLoadQuery(
  graphql`
    query HomePageQuery {
      posts {
        edges {
          node {
            id
            ...PostCard_post  # Spread fragment
          }
        }
      }
    }
  `,
  {}
);

return (
  <div>
    {data.posts.edges.map(edge => (
      <PostCard key={edge.node.id} post={edge.node} />
    ))}
  </div>
);
```

### Pattern 3: Refetching Data

```typescript
const [data, refetch] = useRefetchableFragment(
  graphql`
    fragment PostCard_post on Post @refetchable(queryName: "PostCardRefetchQuery") {
      id
      likesCount
    }
  `,
  postRef
);

const handleRefresh = () => {
  refetch({}, { fetchPolicy: 'network-only' });
};
```

## Troubleshooting

### Issue: Types not found

**Problem**: `Cannot find module './__generated__/MyQuery.graphql'`

**Solution**: Run the Relay compiler:
```bash
npm run relay
```

### Issue: Stale data

**Problem**: UI doesn't update after mutation

**Solution**: Use `optimisticUpdater` or ensure mutation returns updated fields:

```typescript
commitMutation({
  optimisticUpdater: (store) => {
    const record = store.get(id);
    record?.setValue(newValue, 'fieldName');
  },
});
```

### Issue: Query suspends forever

**Problem**: Component never renders, stuck loading

**Solution**:
1. Check network tab for GraphQL errors
2. Verify query syntax matches schema
3. Ensure Relay environment is configured correctly

## Resources

- [Relay Documentation](https://relay.dev/docs/)
- [Relay Examples](https://relay.dev/docs/examples/)
- [GraphQL Schema](/Users/shaperosteve/social-media-app/schema.graphql)
- [Relay Config](/Users/shaperosteve/social-media-app/relay.config.json)

## Need Help?

- Check existing Relay components: `/Users/shaperosteve/social-media-app/packages/frontend/src/components/**/*.relay.tsx`
- Review migration docs: `/Users/shaperosteve/social-media-app/GRAPHQL_ARCHITECTURE_ANALYSIS.md`
- Ask in #frontend-help Slack channel
