#!/bin/bash
# Wait for GraphQL server to be ready before running codegen

MAX_RETRIES=30
RETRY_DELAY=2
GRAPHQL_URL="http://localhost:4000/"

echo "Waiting for GraphQL server at $GRAPHQL_URL..."

for i in $(seq 1 $MAX_RETRIES); do
  if curl -s -f -o /dev/null "$GRAPHQL_URL"; then
    echo "✓ GraphQL server is ready!"
    exec pnpm --filter @social-media-app/web codegen:watch
    exit 0
  fi

  echo "  Attempt $i/$MAX_RETRIES: Server not ready yet, waiting ${RETRY_DELAY}s..."
  sleep $RETRY_DELAY
done

echo "✗ GraphQL server did not become ready after ${MAX_RETRIES} attempts"
echo "  Please ensure the GraphQL server is running on port 4000"
exit 1
