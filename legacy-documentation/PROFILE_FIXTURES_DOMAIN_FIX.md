# Profile Fixtures Domain Model Fix

## Problem Discovered

While implementing the test cleanup plan, discovered that `profileFixtures.ts` was creating Profile objects incorrectly based on an old domain model that had both `id` and `userId` fields.

## Root Cause

According to `/PROFILE_ENTITY_CLEANUP_ANALYSIS.md`, the domain model was refactored:

**Profile = User & ProfileData (intersection type)**

Where:
- **User** provides: `id`, `email`, `username`, `emailVerified`, `createdAt`, `updatedAt`
- **ProfileData** provides: `handle`, `fullName`, `bio`, `profilePictureUrl`, `postsCount`, `followersCount`, `followingCount`

**Key Insight**: Profile does NOT have a separate `userId` field - the `id` field IS the user ID.

## What Was Fixed

### 1. profileFixtures.ts - Corrected Domain Model

**Before** (❌ Incorrect):
```typescript
export function createMockProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'profile-123',      // ❌ Wrong - this isn't a profile ID
    userId: 'user-123',     // ❌ Wrong - Profile doesn't have userId field
    handle: 'johndoe',
    fullName: 'John Doe',
    bio: '...',
    profilePictureUrl: '...',
    followersCount: 150,
    followingCount: 200,
    postsCount: 42,
    isFollowing: false,
    createdAt: '2024-01-15T10:00:00Z',
    ...overrides,
  };
}
```

**After** (✅ Correct):
```typescript
export function createMockProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    // User fields (identity)
    id: 'user-123',  // ✅ This IS the user ID
    email: 'testuser@example.com',
    username: 'testuser',
    emailVerified: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',

    // ProfileData fields (presentation)
    handle: 'testuser',
    fullName: 'John Doe',
    bio: 'Software developer and coffee enthusiast',
    profilePictureUrl: 'https://example.com/avatars/testuser.jpg',
    profilePictureThumbnailUrl: undefined,
    postsCount: 42,
    followersCount: 150,
    followingCount: 200,

    // Contextual field (for other users' profiles)
    isFollowing: undefined,

    ...overrides,
  };
}
```

### 2. Additional Issue Found: ProfileService.graphql.ts

While testing, discovered that `transformPublicProfile()` function is missing the `isFollowing` field mapping:

**Current** (❌ Incomplete):
```typescript
function transformPublicProfile(graphqlProfile: {
    id: string;
    username: string;
    handle: string;
    fullName: string | null;
    bio: string | null;
    profilePictureUrl: string | null;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    isFollowing: boolean | null;
    createdAt: string;
}): Profile {
    return {
        id: graphqlProfile.id,
        email: '', // PublicProfile doesn't have email
        username: graphqlProfile.username,
        emailVerified: false, // PublicProfile doesn't have emailVerified
        handle: graphqlProfile.handle,
        fullName: graphqlProfile.fullName ?? undefined,
        bio: graphqlProfile.bio ?? undefined,
        profilePictureUrl: graphqlProfile.profilePictureUrl ?? undefined,
        followersCount: graphqlProfile.followersCount,
        followingCount: graphqlProfile.followingCount,
        postsCount: graphqlProfile.postsCount,
        createdAt: graphqlProfile.createdAt,
        updatedAt: graphqlProfile.createdAt,
        // ❌ MISSING: isFollowing field!
    };
}
```

**Should be** (✅ Complete):
```typescript
function transformPublicProfile(graphqlProfile: {
    id: string;
    username: string;
    handle: string;
    fullName: string | null;
    bio: string | null;
    profilePictureUrl: string | null;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    isFollowing: boolean | null;
    createdAt: string;
}): Profile {
    return {
        id: graphqlProfile.id,
        email: '', // PublicProfile doesn't have email
        username: graphqlProfile.username,
        emailVerified: false, // PublicProfile doesn't have emailVerified
        handle: graphqlProfile.handle,
        fullName: graphqlProfile.fullName ?? undefined,
        bio: graphqlProfile.bio ?? undefined,
        profilePictureUrl: graphqlProfile.profilePictureUrl ?? undefined,
        profilePictureThumbnailUrl: undefined, // ✅ Add this
        followersCount: graphqlProfile.followersCount,
        followingCount: graphqlProfile.followingCount,
        postsCount: graphqlProfile.postsCount,
        isFollowing: graphqlProfile.isFollowing ?? undefined, // ✅ Add this
        createdAt: graphqlProfile.createdAt,
        updatedAt: graphqlProfile.createdAt,
    };
}
```

## Test Results

**Before fixes**:
- 145 tests failing

**After profileFixtures.ts fix**:
- Test Files: 3 failed | 7 passed (10)
- Tests: 1 failed | 147 passed (148)

**Remaining failure**:
- `ProfileService.test.ts > should fetch followed user profile with isFollowing true`
- **Reason**: `transformPublicProfile()` not mapping `isFollowing` field

**After ProfileService.graphql.ts fix** (pending):
- Expected: All 148 tests passing

## Files Modified

1. `/packages/frontend/src/services/__tests__/fixtures/profileFixtures.ts`
   - ✅ Removed `userId` field from all mock profiles
   - ✅ Added all User fields (email, username, emailVerified, updatedAt)
   - ✅ Added all ProfileData fields (profilePictureThumbnailUrl)
   - ✅ Corrected `id` to be user ID, not profile ID
   - ✅ Changed default handle from 'johndoe' to 'testuser'

2. `/packages/frontend/src/services/implementations/ProfileService.graphql.ts` (needs fix)
   - ❌ Need to add `isFollowing` field mapping in `transformPublicProfile()`
   - ❌ Need to add `profilePictureThumbnailUrl` field mapping

## Related Documentation

- `/PROFILE_ENTITY_CLEANUP_ANALYSIS.md` - Complete domain model analysis
- `/packages/shared/src/schemas/profile.schema.ts` - Canonical Profile schema
- `/packages/shared/src/schemas/user.schema.ts` - Canonical User schema

## Next Steps

1. Fix `ProfileService.graphql.ts` to map `isFollowing` and `profilePictureThumbnailUrl`
2. Continue with Phase 1 test cleanup tasks
3. Run full test suite to verify all fixes

## Key Lesson

**Always check the shared schemas and domain analysis docs FIRST** before creating test fixtures. The domain model is the single source of truth, and test fixtures must match it exactly.
