# Authentication After Registration - Bug Fix Summary

## Problem

Users were **not authenticated** after registering a new account, despite the backend returning auth tokens. GraphQL requests were failing with `400 Bad Request` errors because they were missing the `Authorization` header.

### Root Cause

The GraphQL client singleton was created once at startup with `authToken: null` and **never updated** when users logged in or registered. The flow was:

1. User registers → authStore updated ✅
2. localStorage updated ✅
3. **GraphQL client NEVER updated** ❌
4. All GraphQL requests fail with 400 (missing auth header) ❌

### Console Error

```
POST http://localhost:4000/graphql 400 (Bad Request)
Failed to load explore feed: GraphQL Error (Code: 400)
Failed to fetch unread count: You must be authenticated to access notifications
```

## Solution

Created a **GraphQL Client Manager** to keep the GraphQL client synchronized with authentication state.

### Files Created

#### `/packages/frontend/src/graphql/clientManager.ts`
New manager module that:
- Manages the GraphQL client singleton
- Provides `setGraphQLAuthToken(token)` to update the auth token
- Automatically called when auth state changes

### Files Modified

#### `/packages/frontend/src/stores/authStore.ts`
Updated to sync GraphQL client when auth state changes:

```typescript
import { setGraphQLAuthToken } from '../graphql/clientManager.js';

// In setTokens action:
setTokens: (tokens) => {
  set({ tokens, isAuthenticated: !!(tokens && get().user) });
  // Sync GraphQL client with new tokens
  setGraphQLAuthToken(tokens?.accessToken || null);
}

// In login action:
login: (user, tokens) => {
  set({ user, tokens, isAuthenticated: true, error: null, isLoading: false });
  // Sync GraphQL client with new tokens
  setGraphQLAuthToken(tokens.accessToken);
}

// In logout action:
logout: () => {
  set({ user: null, tokens: null, isAuthenticated: false, error: null, isLoading: false });
  // Clear GraphQL client auth token
  setGraphQLAuthToken(null);
}

// In onRehydrateStorage (app startup):
onRehydrateStorage: () => (state) => {
  state?.setHydrated(true);
  // Sync GraphQL client with rehydrated tokens
  if (state?.tokens?.accessToken) {
    setGraphQLAuthToken(state.tokens.accessToken);
  }
}
```

#### `/packages/frontend/src/services/feedService.ts`
Updated to use centralized client manager:

```typescript
import { getGraphQLClient } from '../graphql/clientManager.js';

export function getFeedService(): FeedServiceGraphQL {
    if (!_feedService) {
        _feedService = new FeedServiceGraphQL(getGraphQLClient());
    }
    return _feedService;
}
```

#### `/packages/frontend/src/services/notificationDataService.ts`
Updated to use centralized client manager:

```typescript
import { getGraphQLClient } from '../graphql/clientManager.js';

export const notificationDataService = new NotificationDataServiceGraphQL(
  getGraphQLClient()
);
```

## How It Works

### Before (Broken)

```
1. App starts → GraphQLClient created with authToken: null
2. User registers → authStore & localStorage updated
3. GraphQL requests made → Authorization header missing ❌
4. Requests fail with 400 Bad Request ❌
```

### After (Fixed)

```
1. App starts → GraphQLClient created with authToken: null
2. User registers → authStore updated
3. authStore calls setGraphQLAuthToken(accessToken) ✅
4. GraphQLClient.setAuthToken() updates headers ✅
5. GraphQL requests include Authorization: Bearer {token} ✅
6. Requests succeed ✅
```

### On App Restart

```
1. App starts → authStore rehydrates from localStorage
2. onRehydrateStorage callback runs
3. Calls setGraphQLAuthToken(rehydratedAccessToken) ✅
4. GraphQLClient starts with correct auth token ✅
5. All requests work immediately ✅
```

## Testing

### Manual Testing Steps

1. **Clear application data**:
   ```javascript
   localStorage.clear();
   ```

2. **Register a new account**:
   - Navigate to registration page
   - Fill in email, username, password
   - Submit form

3. **Verify authentication works**:
   - Check if explore feed loads (no 400 errors)
   - Check if notification bell shows count (no auth errors)
   - Check browser console for successful GraphQL requests

4. **Verify persistence**:
   - Refresh page
   - Check if user is still authenticated
   - Check if GraphQL requests still work

### Expected Console Logs

```
🔐 useAuth: Starting registration for: user@example.com
✅ useAuth: Registration API call successful
🔑 useAuth: Tokens received, logging user in automatically
🌐 Setting GraphQL auth token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
✅ Feed loaded successfully
✅ Notifications loaded successfully
```

## Impact

- ✅ Users are automatically authenticated after registration
- ✅ All GraphQL requests include proper Authorization header
- ✅ Explore feed loads without errors
- ✅ Notifications load without errors
- ✅ Authentication persists across page refreshes
- ✅ No breaking changes to existing code
- ✅ Type-safe implementation

## Related Files

- `/packages/frontend/src/graphql/clientManager.ts` - New client manager
- `/packages/frontend/src/graphql/client.ts` - GraphQL client with setAuthToken()
- `/packages/frontend/src/stores/authStore.ts` - Auth state management
- `/packages/frontend/src/services/feedService.ts` - Feed service singleton
- `/packages/frontend/src/services/notificationDataService.ts` - Notification service singleton
- `/packages/frontend/src/hooks/useAuth.ts` - Auth hook with auto-login logic
- `/packages/frontend/src/components/auth/RegisterForm.tsx` - Registration form

## Future Improvements

1. Add integration tests for auth flow
2. Add unit tests for clientManager
3. Consider using a more reactive approach (RxJS) for token updates
4. Add token refresh logic when token expires
5. Add proper error handling for expired tokens

## Commit Message

```
fix(auth): sync GraphQL client with auth state after registration

Users were not authenticated after registering because the GraphQL
client singleton was never updated with the new auth token. Created
a clientManager to keep the GraphQL client synchronized with auth
state changes (login, register, logout, rehydration).

Fixes:
- GraphQL 400 errors after registration
- Missing Authorization headers on GraphQL requests
- Authentication not persisting across page refreshes

Changes:
- Created /packages/frontend/src/graphql/clientManager.ts
- Updated authStore to call setGraphQLAuthToken() on state changes
- Updated feedService to use getGraphQLClient()
- Updated notificationDataService to use getGraphQLClient()
```
