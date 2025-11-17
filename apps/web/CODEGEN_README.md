# GraphQL Code Generator

This app uses [GraphQL Code Generator](https://the-guild.dev/graphql/codegen) to automatically generate TypeScript types from the Pothos GraphQL schema.

## Why?

**Before codegen:**
- ❌ Manual TypeScript types (can drift from schema)
- ❌ No compile-time safety for queries
- ❌ Runtime errors when schema changes

**With codegen:**
- ✅ Auto-generated types always match schema
- ✅ Compile-time errors for invalid queries
- ✅ Full autocomplete for GraphQL operations
- ✅ Catches schema mismatches before runtime

## How It Works

1. **Schema Source**: Reads from `http://localhost:4000/graphql` (Pothos-generated schema)
2. **Documents**: Scans all `.ts`/`.tsx` files for `gql` queries/mutations
3. **Generates**: `lib/graphql/generated.ts` with TypeScript types
4. **Auto-formats**: Runs Prettier after generation

## Usage

### Development Workflow

**Option 1: Integrated (Recommended)**
```bash
# From repo root - runs GraphQL server, Next.js, and codegen watch
pnpm dev:nextjs
```

This starts three processes:
- `GQL`: GraphQL server on port 4000
- `NEXT`: Next.js dev server on port 3000
- `CODEGEN`: Watches for query/schema changes and regenerates types

**Option 2: Manual**
```bash
# Terminal 1: Start GraphQL server
pnpm dev:graphql

# Terminal 2: Run codegen once
cd apps/web
pnpm codegen

# Or run in watch mode
pnpm codegen:watch
```

### Production Build

Codegen runs automatically before build:
```bash
pnpm build:web
# ↓ Runs: prebuild → codegen → build
```

This ensures production builds always have up-to-date types.

## When to Run Codegen

**Automatically regenerates when:**
- GraphQL queries change (when using `codegen:watch`)
- GraphQL schema changes (when using `codegen:watch`)

**Must manually run when:**
- After pulling schema changes from git
- After adding new queries/mutations (if not using watch mode)
- Build fails with type errors related to GraphQL

## Troubleshooting

### Error: "Failed to fetch schema"
**Cause**: GraphQL server isn't running
**Fix**: Start server with `pnpm dev:graphql`

### Error: "Cannot find module './generated'"
**Cause**: Types haven't been generated yet
**Fix**: Run `pnpm codegen` from `apps/web`

### Types are outdated
**Cause**: Schema changed but codegen didn't run
**Fix**: Restart codegen watch or run `pnpm codegen` manually

## Configuration

See `codegen.yml` for configuration. Key settings:

- **schema**: GraphQL server URL
- **documents**: Where to find queries/mutations
- **generates**: Output file path
- **plugins**: TypeScript types + typed document nodes

## Migration Path

To migrate existing manual types to generated ones:

1. ✅ Run codegen to generate types
2. Import generated types instead of manual ones:
   ```typescript
   // Before
   import type { CreatePostResponse } from '@/lib/graphql/types';

   // After
   import type { CreatePostMutation } from '@/lib/graphql/generated';
   ```
3. Delete manual type definitions from `types.ts`
4. Verify TypeScript compilation passes
