# Test Coverage Summary - Next.js Migration

**Last Updated:** 2025-11-13
**Test Framework:** Vitest + React Testing Library
**Test Philosophy:** Behavioral testing, no mocks/spies (except module-level stubs)

---

## ✅ Test Coverage - What's Tested

### PostCard Component (14 tests) ✅

**File:** `apps/web/__tests__/components/PostCard.test.tsx`
**Coverage:** 100% of user-facing behavior

#### Post Display (4 tests)
- ✅ Renders post content correctly (caption, likes, comments count)
- ✅ Displays author information (username, handle, avatar)
- ✅ Displays post image
- ✅ Renders without caption if none provided

#### Like State Display (2 tests)
- ✅ Shows empty heart icon when post is not liked
- ✅ Shows filled heart icon when post is already liked

#### Like Interaction (6 tests)
- ✅ Updates UI optimistically when clicking like
- ✅ Updates UI optimistically when clicking unlike
- ✅ Syncs with server response after successful like
- ✅ Shows error alert when like fails
- ✅ Disables button during mutation
- ✅ Re-enables button after mutation completes

#### Comment Interaction (1 test)
- ✅ Navigates to post detail when clicking comment button

#### Accessibility (1 test)
- ✅ Shows time in readable format

---

## ⏳ Test Coverage - What Needs Tests

### Server Actions (Priority: High)
**Files needing tests:**
- `apps/web/app/actions/posts.ts` - likePost, unlikePost

**Test scenarios:**
- [ ] likePost calls GraphQL with correct postId
- [ ] unlikePost calls GraphQL with correct postId
- [ ] Server Actions revalidate correct paths
- [ ] Error handling when GraphQL fails
- [ ] Error handling when auth is missing

**Approach:** Integration tests with real GraphQL server (LocalStack)

---

### Explore Page (Priority: Medium)
**File:** `apps/web/app/(app)/explore/page.tsx`

**Test scenarios:**
- [ ] Loads posts from exploreFeed query
- [ ] Displays correct number of posts
- [ ] Shows error message when GraphQL fails
- [ ] Shows empty state when no posts
- [ ] Passes correct props to PostCard components

**Approach:** Server Component testing (requires special setup)

---

### GraphQL Client (Priority: Medium)
**File:** `apps/web/lib/graphql/client.ts`

**Test scenarios:**
- [ ] Creates GraphQL client with auth headers
- [ ] Reads JWT from cookies
- [ ] Handles missing authentication gracefully
- [ ] Constructs correct GraphQL endpoint URL

**Approach:** Unit tests with dependency injection

---

### Auth API Routes (Priority: Low - Backend coverage sufficient)
**Files:**
- `apps/web/app/api/auth/login/route.ts`
- `apps/web/app/api/auth/register/route.ts`
- `apps/web/app/api/auth/logout/route.ts`
- `apps/web/app/api/auth/refresh/route.ts`

**Note:** These wrap backend services that already have comprehensive tests.
Consider integration tests instead of unit tests.

---

### Middleware (Priority: Medium)
**File:** `apps/web/middleware.ts`

**Test scenarios:**
- [ ] Redirects unauthenticated users from protected routes
- [ ] Allows authenticated users to access protected routes
- [ ] Redirects authenticated users away from auth pages
- [ ] Handles token refresh correctly

---

## 📊 Test Metrics

### Current Stats
- **Total Test Files:** 1
- **Total Tests:** 14
- **Passing:** 14 (100%)
- **Failing:** 0
- **Coverage:** ~20% of Next.js app (PostCard component only)

### Target for Phase 5 Complete
- **Total Test Files:** 5-8
- **Total Tests:** 50-70
- **Coverage Goal:** 90% of critical paths
- **Coverage Thresholds (vitest.config.ts):**
  - Lines: 90%
  - Functions: 85%
  - Branches: 85%
  - Statements: 90%

---

## 🧪 Test Fixtures & Utilities

### Available Fixtures

**Next.js-specific:**
- `createMockAuthor()` - GraphQL Author type
- `createMockPost()` - GraphQL Post with author
- `createMockPosts(count)` - Multiple posts
- `createMockPostWithLikes()` - Post with like status
- `createMockPostWithComments()` - Post with comments
- `createMockFeedQueryResponse()` - Relay-style pagination
- `createMockLikeResponse()` - Like mutation response
- `createMockUnlikeResponse()` - Unlike mutation response

**From @social-media-app/shared/test-utils:**
- AWS mocks (DynamoDB, S3, API Gateway)
- Profile fixtures
- Post fixtures
- Feed fixtures
- Comment fixtures
- Like fixtures
- Notification fixtures
- Error scenarios

---

## 🎯 Testing Guidelines (Applied)

### ✅ What We're Doing Right

1. **Behavioral Testing**
   - Tests focus on what the component does, not how
   - Example: "should update UI optimistically" vs "should call setState"

2. **No Mocks/Spies (where possible)**
   - Only module-level stubs for Server Actions
   - Framework mocks (Next.js router, Image) are acceptable
   - Real user interactions with `userEvent.setup()`

3. **DRY with Helpers**
   - Reusable `createMockPost()` fixtures
   - Shared test utilities from `@social-media-app/shared`
   - Clean, readable test code

4. **Type-Safe Throughout**
   - All fixtures return proper TypeScript types
   - No `any` types in test code
   - Full autocomplete in tests

5. **Test Core Cases + Key Edge Cases**
   - Happy path: like/unlike works
   - Edge case: error handling and rollback
   - Edge case: server sync with different count
   - Not testing every possible permutation

---

## 📝 Next Steps for Test Coverage

### Immediate (This Sprint)
1. ✅ **PostCard tests** - Done!
2. **Server Actions tests** - Integration tests with GraphQL
3. **Explore page tests** - Server Component testing

### Short-term (Next Sprint)
4. **Auth middleware tests** - Route protection
5. **GraphQL client tests** - Auth header injection
6. **Additional component tests** as we build them

### Long-term (Before Production)
7. **E2E tests** - Critical user journeys (Playwright?)
8. **Performance tests** - Load testing
9. **Accessibility tests** - a11y compliance

---

## 🚀 Running Tests

### Run All Tests
```bash
pnpm --filter=@social-media-app/web test
```

### Run Tests in Watch Mode
```bash
pnpm --filter=@social-media-app/web test --watch
```

### Run Tests with Coverage
```bash
pnpm --filter=@social-media-app/web test --coverage
```

### Run Specific Test File
```bash
pnpm --filter=@social-media-app/web test PostCard
```

### Run Tests in CI
```bash
pnpm --filter=@social-media-app/web test --run
```

---

## 💡 Testing Best Practices

### Writing New Tests

**DO:**
- ✅ Test user behavior, not implementation
- ✅ Use descriptive test names ("should show error alert when like fails")
- ✅ Arrange-Act-Assert structure
- ✅ Use fixtures for test data
- ✅ Test both happy path and errors
- ✅ Use `waitFor` for async assertions
- ✅ Clean up mocks/spies in `beforeEach`

**DON'T:**
- ❌ Test internal state or private methods
- ❌ Mock everything (only what's necessary)
- ❌ Write brittle tests tied to implementation
- ❌ Use `any` or `unknown` types
- ❌ Test framework internals
- ❌ Skip edge case testing

### Example: Good vs Bad Test

**❌ Bad (Implementation-focused):**
```typescript
it('should call useState with new value', () => {
  const setState = vi.fn();
  // Testing React internals
});
```

**✅ Good (Behavior-focused):**
```typescript
it('should update like count when clicking like button', async () => {
  render(<PostCard post={post} />);
  await user.click(likeButton);
  expect(screen.getByText('11')).toBeInTheDocument();
});
```

---

## 📚 Resources

### Documentation
- [Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library User Events](https://testing-library.com/docs/user-event/intro/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)

### Internal
- `packages/shared/src/test-utils/README.md` - Shared test utilities
- `TESTING_GUIDE.md` - Integration testing guide
- Test fixtures in `@social-media-app/shared/test-utils`

---

## 🎯 Current Test Health

**Status:** 🟢 **Healthy**

- ✅ All tests passing
- ✅ No flaky tests
- ✅ Fast execution (<10s)
- ✅ Type-safe fixtures
- ✅ Following TDD guidelines
- ✅ Good test coverage for completed features

**Next Milestone:** 50+ tests covering Server Actions, pages, and middleware

---

**Author:** Claude
**Last Updated:** 2025-11-13
