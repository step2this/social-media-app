import { GraphQLClient } from 'graphql-request';
import { cookies } from 'next/headers';

/**
 * Get GraphQL client for Server Components
 * Automatically includes JWT token from HTTP-only cookies
 */
export async function getGraphQLClient() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  return new GraphQLClient(
    process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql',
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );
}

/**
 * Get GraphQL client for Client Components
 * Credentials: 'include' sends HTTP-only cookies automatically
 */
export function getClientGraphQLClient() {
  return new GraphQLClient(
    process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql',
    {
      credentials: 'include',
    }
  );
}
