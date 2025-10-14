# @social-media-app/graphql-server

GraphQL server package with Apollo Server v4 and AWS Lambda integration.

## Overview

This package provides a complete GraphQL API server for the social media application, replacing the existing REST API with a modern GraphQL implementation.

## Features

- **Apollo Server v4**: Latest Apollo Server with full GraphQL specification support
- **AWS Lambda Integration**: Serverless deployment via API Gateway
- **Type Safety**: Full TypeScript support with GraphQL Code Generator
- **DataLoaders**: Efficient batching and caching to solve N+1 queries
- **Schema-First Design**: Clear separation of schema and resolvers
- **TDD Approach**: Comprehensive test coverage from the start

## Architecture

### Package Structure

```
src/
├── schema/
│   ├── typeDefs.ts           # GraphQL schema definition
│   ├── resolvers/            # Resolver implementations
│   │   ├── index.ts          # Combined resolvers
│   │   ├── Query.ts          # Query resolvers
│   │   ├── Mutation.ts       # Mutation resolvers
│   │   ├── Profile.ts        # Profile type resolvers
│   │   ├── Post.ts           # Post type resolvers
│   │   └── Comment.ts        # Comment type resolvers
│   └── generated/            # Generated TypeScript types
│       └── types.ts
├── dataloaders/              # DataLoader implementations
│   └── index.ts
├── context.ts                # GraphQL context creation
├── server.ts                 # Apollo Server instance
└── lambda.ts                 # Lambda handler
```

## Scripts

- `pnpm build` - Build TypeScript to dist/
- `pnpm dev` - Watch mode for development
- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Generate test coverage report
- `pnpm codegen` - Generate TypeScript types from schema
- `pnpm codegen:watch` - Watch mode for code generation
- `pnpm type-check` - Check types without building
- `pnpm clean` - Remove build artifacts

## Development Workflow

1. **Define Schema**: Update `src/schema/typeDefs.ts`
2. **Generate Types**: Run `pnpm codegen`
3. **Write Tests**: Create tests in `__tests__/`
4. **Implement Resolvers**: Add resolver logic
5. **Verify**: Run `pnpm test` and `pnpm type-check`

## Dependencies

### Core
- `@apollo/server` - Apollo Server v4
- `@as-integrations/aws-lambda` - Lambda integration
- `graphql` - GraphQL implementation
- `dataloader` - Batching and caching

### Internal
- `@social-media-app/dal` - Data access layer
- `@social-media-app/shared` - Shared schemas and types

### AWS
- `@aws-sdk/client-dynamodb` - DynamoDB client
- `@aws-sdk/lib-dynamodb` - DynamoDB document client

## Testing

Tests are organized by category:
- `__tests__/schema.test.ts` - Schema validation tests
- `__tests__/resolvers/` - Unit tests for resolvers
- `__tests__/integration/` - End-to-end integration tests

## Code Generation

This package uses GraphQL Code Generator to create TypeScript types from the schema:

```bash
pnpm codegen
```

Generated types are placed in `src/schema/generated/types.ts` and provide:
- Type-safe resolver signatures
- Input/output type definitions
- Context type integration

## Next Steps

1. Define complete GraphQL schema
2. Implement DataLoaders for efficient data fetching
3. Create resolver implementations with TDD
4. Add authentication and authorization
5. Implement error handling and logging
6. Add performance monitoring
7. Create CDK construct for deployment
