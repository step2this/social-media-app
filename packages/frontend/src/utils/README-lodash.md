# Using lodash-es in This Codebase

## ✅ Verified Working

The `lodash-es` package is properly installed and works with our ESM/TypeScript setup.

**Test Results**: All 8 tests passing ✓ (see `lodashTest.test.ts`)

## Correct Import Syntax

### ✅ DO: Use Named Imports

```typescript
// Tree-shakeable, ESM-compatible
import { groupBy, chunk, shuffle, sortBy } from 'lodash-es';

const grouped = groupBy(posts, 'userId');
const pages = chunk(posts, 24);
const randomized = shuffle(posts);
```

### ❌ DON'T: Use Default Import

```typescript
// ❌ Breaks tree-shaking and may cause ESM issues
import _ from 'lodash-es';

const grouped = _.groupBy(posts, 'userId');
```

## Available Functions

Common lodash functions that work with our setup:

- **Collection**: `groupBy`, `sortBy`, `shuffle`, `filter`, `map`, `reduce`, `find`, `some`, `every`
- **Array**: `chunk`, `flatten`, `uniq`, `intersection`, `difference`, `take`, `drop`
- **Object**: `pick`, `omit`, `merge`, `cloneDeep`, `get`, `set`, `has`
- **Function**: `debounce`, `throttle`, `memoize`, `once`
- **Lang**: `isEqual`, `isEmpty`, `isNil`, `cloneDeep`

## Example Usage

See `lodashTest.ts` for working examples:

```typescript
// Group posts by user
const postsByUser = groupBy(posts, 'userId');

// Paginate posts
const pages = chunk(posts, 24);

// Randomize order
const shuffled = shuffle(posts);

// Sort by multiple criteria
const sorted = sortBy(posts, [
  (post) => -post.likesCount,  // Descending likes
  'createdAt'                   // Then by date
]);
```

## Why This Works

1. **lodash-es** is the ESM version of lodash (not CommonJS)
2. Our TypeScript config uses `"module": "ESNext"`
3. Package.json has `"type": "module"` for pure ESM
4. Named imports enable tree-shaking (only bundle what you use)
5. `@types/lodash-es` provides full TypeScript support

## Performance

Named imports ensure only the functions you use are bundled, keeping bundle size minimal. The build process will tree-shake unused functions.

## References

- Test File: `/packages/frontend/src/utils/lodashTest.test.ts`
- Example File: `/packages/frontend/src/utils/lodashTest.ts`
- Package: `lodash-es@^4.17.21`
- Types: `@types/lodash-es@^4.17.0`
