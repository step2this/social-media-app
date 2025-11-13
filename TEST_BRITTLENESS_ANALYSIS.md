# Test Brittleness Analysis & Recommendations

**Question:** Are our tests brittle? Will they survive as we evolve the site?

**TL;DR:** Yes, somewhat brittle. Here's how to fix it.

---

## 🔴 Current Brittleness Issues

### 1. Hard-coded Text Content
```typescript
// ❌ BRITTLE - breaks if we change icon library
expect(screen.getByText('favorite_border')).toBeInTheDocument();
expect(screen.getByText('favorite')).toBeInTheDocument();
```

**Problem:** If we switch from Material Icons to Heroicons, all tests break.

**Better approach:**
```typescript
// ✅ RESILIENT - tests aria-label, not implementation
expect(screen.getByLabelText('Like post')).toBeInTheDocument();
expect(screen.getByLabelText('Unlike post')).toBeInTheDocument();

// Or use data-testid
expect(screen.getByTestId('like-button')).toBeInTheDocument();
```

---

### 2. Button Index Selection
```typescript
// ❌ BRITTLE - breaks if button order changes
const likeButton = screen.getAllByRole('button')[0];
const commentButton = screen.getAllByRole('button')[1];
```

**Problem:** Adding a new button or reordering breaks tests.

**Better approach:**
```typescript
// ✅ RESILIENT - select by accessible name or test ID
const likeButton = screen.getByRole('button', { name: /like/i });
const commentButton = screen.getByRole('button', { name: /comment/i });

// Or with data-testid
const likeButton = screen.getByTestId('like-button');
```

---

### 3. Module-Level Mocks
```typescript
// ❌ SOMEWHAT BRITTLE - tight coupling to module path
vi.mock('@/app/actions/posts', () => ({
  likePost: vi.fn(),
  unlikePost: vi.fn(),
}));
```

**Problems:**
- Breaks if we rename the file
- Breaks if we change import path
- Can't catch interface changes
- Hard to swap implementations

**Better approaches:**

#### Option A: Dependency Injection
```typescript
// Component accepts Server Actions as props
interface PostCardProps {
  post: Post;
  onLike?: (postId: string) => Promise<LikeResponse>;
  onUnlike?: (postId: string) => Promise<LikeResponse>;
}

// In tests, inject test implementations
render(
  <PostCard
    post={post}
    onLike={mockLikePost}
    onUnlike={mockUnlikePost}
  />
);
```

**Pros:**
- No module mocks needed
- Easy to test different implementations
- Clear dependencies

**Cons:**
- More boilerplate
- Props drilling for nested components

---

#### Option B: MSW (Mock Service Worker)
```typescript
// Intercept HTTP at network level
import { setupServer } from 'msw/node';
import { graphql } from 'msw';

const server = setupServer(
  graphql.mutation('LikePost', (req, res, ctx) => {
    return res(ctx.data({
      likePost: { success: true, likesCount: 11, isLiked: true }
    }));
  })
);

// No module mocks - tests real Server Actions!
```

**Pros:**
- Tests real Server Actions code
- No mocking internal modules
- Catches interface changes
- Works at HTTP boundary

**Cons:**
- More setup complexity
- Requires MSW configuration

---

#### Option C: Integration Tests
```typescript
// Test against real GraphQL server (LocalStack)
it('should like post end-to-end', async () => {
  // Start real GraphQL server
  // Real database (DynamoDB in LocalStack)
  // Real Server Actions
  // Real component

  render(<PostCard post={post} />);
  await user.click(likeButton);

  // Verify in database
  const likeCount = await getLikeCountFromDB(postId);
  expect(likeCount).toBe(11);
});
```

**Pros:**
- Tests real system
- Catches integration issues
- No mocks at all!

**Cons:**
- Slower (database I/O)
- More complex setup
- Harder to isolate failures

---

## 🟡 What's Acceptable Brittleness?

Some coupling is inevitable and acceptable:

### ✅ OK to be brittle about:
- **User-facing text** - If button says "Like", users expect "Like"
- **Interaction patterns** - If users click buttons, test clicks
- **Visual indicators** - If liked posts show red hearts, test that
- **URLs** - If comment navigates to `/post/123`, test that

### ❌ NOT OK to be brittle about:
- **Implementation details** - React hooks, state management
- **Component structure** - CSS classes, DOM hierarchy
- **Internal naming** - Variable names, function names
- **Icon library choice** - Material Icons vs Heroicons
- **Button order** - Unless order is critical to UX

---

## 🟢 Recommended Approach: Hybrid

### For Unit Tests (Components)
**Use:** Dependency Injection + Accessible Queries

```typescript
// Component
interface PostCardProps {
  post: Post;
  onLike?: typeof likePost;  // Use actual type
  onUnlike?: typeof unlikePost;
}

export function PostCard({
  post,
  onLike = likePost,  // Default to real implementation
  onUnlike = unlikePost,
}: PostCardProps) {
  // ...
}

// Test
it('should update UI when like succeeds', async () => {
  const mockLike = vi.fn().mockResolvedValue({
    success: true,
    likesCount: 11,
    isLiked: true,
  });

  render(<PostCard post={post} onLike={mockLike} />);

  const likeButton = screen.getByRole('button', { name: /like/i });
  await user.click(likeButton);

  expect(screen.getByText('11')).toBeInTheDocument();
  expect(mockLike).toHaveBeenCalledWith('post-1');
});
```

**Benefits:**
- ✅ No module mocks
- ✅ Easy to test different scenarios
- ✅ Production code uses real Server Actions
- ✅ Tests are isolated and fast

---

### For Integration Tests (Pages/Flows)
**Use:** MSW or Real GraphQL Server

```typescript
// Setup MSW
const server = setupServer(
  graphql.mutation('LikePost', (req, res, ctx) => {
    return res(ctx.data({
      likePost: { success: true, likesCount: 11, isLiked: true }
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Test
it('should like post end-to-end', async () => {
  render(<ExplorePage />);  // Real page, real Server Actions

  const likeButtons = await screen.findAllByRole('button', { name: /like/i });
  await user.click(likeButtons[0]);

  await waitFor(() => {
    expect(screen.getByText('11')).toBeInTheDocument();
  });
});
```

**Benefits:**
- ✅ Tests real Server Actions
- ✅ Catches integration issues
- ✅ No module mocks
- ✅ Relatively fast (mocked HTTP, not real DB)

---

## 📋 Action Items

### Immediate Fixes (This PR)
1. **Add test IDs to components**
   ```tsx
   <button
     data-testid="like-button"
     aria-label={isLiked ? 'Unlike post' : 'Like post'}
     onClick={handleLike}
   >
   ```

2. **Update tests to use accessible queries**
   ```typescript
   // Instead of: screen.getAllByRole('button')[0]
   screen.getByRole('button', { name: /like/i })
   // Or: screen.getByTestId('like-button')
   ```

3. **Document trade-offs** (this doc!)

### Short-term (Next Sprint)
4. **Refactor PostCard for DI**
   - Accept `onLike` and `onUnlike` as optional props
   - Default to real Server Actions
   - Update tests to inject mocks

5. **Set up MSW** for integration tests
   - Install MSW
   - Configure handlers for GraphQL mutations
   - Write 2-3 integration tests

### Long-term (Before Production)
6. **Add E2E tests** with Playwright
   - Test critical user journeys
   - Use real backend (staging environment)
   - No mocks at all

7. **Add visual regression tests**
   - Screenshot testing (Percy, Chromatic)
   - Catch UI regressions automatically

---

## 🎯 Specific Recommendations

### PostCard Component

#### Current (Brittle):
```typescript
it('should update UI optimistically', async () => {
  vi.mocked(likePost).mockResolvedValue({...});

  render(<PostCard post={post} />);

  const likeButton = screen.getAllByRole('button')[0];  // Brittle!
  await user.click(likeButton);

  expect(screen.getByText('favorite')).toBeInTheDocument();  // Brittle!
  expect(screen.getByText('11')).toBeInTheDocument();
});
```

#### Recommended (Resilient):
```typescript
it('should update UI optimistically when liking post', async () => {
  const mockLike = vi.fn().mockResolvedValue({
    success: true,
    likesCount: 11,
    isLiked: true,
  });

  render(<PostCard post={post} onLike={mockLike} />);

  // Find by accessible name or test ID
  const likeButton = screen.getByTestId('like-button');
  await user.click(likeButton);

  // Test outcomes, not implementation
  expect(likeButton).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('11')).toBeInTheDocument();
  expect(mockLike).toHaveBeenCalledWith('post-1');
});
```

**Changes needed in component:**
```tsx
export function PostCard({
  post,
  onLike = likePost,  // Default to real implementation
  onUnlike = unlikePost,
}: PostCardProps) {
  // ...

  return (
    <button
      data-testid="like-button"
      aria-label={optimisticLiked ? 'Unlike post' : 'Like post'}
      aria-pressed={optimisticLiked}
      onClick={handleLike}
    >
      {/* icon */}
    </button>
  );
}
```

---

## 📊 Brittleness Score Card

| Aspect | Current Score | Target Score | Priority |
|--------|---------------|--------------|----------|
| Icon dependency | 🔴 High | 🟢 Low | High |
| Button selection | 🔴 High | 🟢 Low | High |
| Module mocks | 🟡 Medium | 🟢 Low | Medium |
| Text content | 🟡 Medium | 🟡 Medium | Low |
| Component structure | 🟢 Low | 🟢 Low | ✓ Good |

**Overall:** 🟡 Medium brittleness → Target: 🟢 Low brittleness

---

## 🚀 Next Steps

1. **Immediate (today):**
   - Add `data-testid` and `aria-label` to PostCard buttons
   - Update tests to use accessible queries
   - Document approach

2. **This week:**
   - Refactor PostCard for dependency injection
   - Write 1-2 MSW-based integration tests
   - Update test guidelines

3. **Next sprint:**
   - Apply pattern to other components
   - Set up Playwright for E2E tests
   - Review test brittleness quarterly

---

## 💡 Key Takeaways

1. **Some brittleness is OK** - Tests should break when user-facing behavior changes
2. **`vi.mock` is convenient but brittle** - Use for quick prototyping, refactor later
3. **Dependency Injection > Module Mocks** - More flexible, less brittle
4. **MSW for integration tests** - Tests real code without real backend
5. **Test by accessibility** - More resilient than DOM structure
6. **Refactor tests as you refactor code** - Tests are first-class citizens

---

**Author:** Claude
**Date:** 2025-11-13
