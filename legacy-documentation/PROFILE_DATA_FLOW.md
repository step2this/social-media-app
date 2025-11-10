# Profile Follow Count Data Flow Diagram

## 1. User Action: Follow Button Click

```
┌─────────────┐
│   Browser   │
│ (fikuruw)   │
└──────┬──────┘
       │ Click "Follow"
       ▼
┌─────────────────────────────────┐
│  FollowButton Component         │
│  - Uses useFollow hook          │
│  - Optimistic UI update:        │
│    followersCount + 1           │
└──────┬──────────────────────────┘
       │ POST /follows
       │ { userId: "target-user-id" }
       ▼
```

## 2. API Request Flow

```
┌────────────────────────────────────┐
│  Express Server (port 3001)        │
│  POST /follows                     │
└──────┬─────────────────────────────┘
       │ Invokes followUser handler
       ▼
┌────────────────────────────────────┐
│  Lambda Handler                    │
│  follow-user.ts                    │
└──────┬─────────────────────────────┘
       │ Calls FollowService
       ▼
┌────────────────────────────────────┐
│  FollowService (DAL)               │
│  followUser(followerId, followeeId)│
└──────┬─────────────────────────────┘
       │ DynamoDB PutCommand
       ▼
┌────────────────────────────────────┐
│  DynamoDB Table (LocalStack)       │
│  INSERT:                           │
│  PK: USER#{followerId}             │
│  SK: FOLLOW#{followeeId}           │
│  GSI1PK: USER#{followeeId}         │
│  GSI1SK: FOLLOWER#{followerId}     │
└──────┬─────────────────────────────┘
       │ Returns hardcoded response:
       │ { success: true,
       │   followersCount: 0,  ⚠️
       │   followingCount: 0, ⚠️
       │   isFollowing: true }
       ▼
┌────────────────────────────────────┐
│  useFollow Hook                    │
│  - Keeps optimistic count (+1)     │
│  - Does NOT call onFollowStatusChange
│  - Pure optimistic UI              │
└────────────────────────────────────┘
```

## 3. Asynchronous Stream Processing

```
┌────────────────────────────────────┐
│  DynamoDB Streams                  │
│  - Stream record created (INSERT)  │
│  - Contains: PK, SK, GSI1PK, etc. │
└──────┬─────────────────────────────┘
       │ Every 2 seconds
       ▼
┌────────────────────────────────────┐
│  StreamProcessor                   │
│  - Polls stream via GetRecords     │
│  - ShardIteratorType: 'LATEST' ⚠️  │
│  - Only sees NEW events after start│
└──────┬─────────────────────────────┘
       │ Transforms to Lambda event
       ▼
┌────────────────────────────────────┐
│  follow-counter.ts Handler         │
│  - Parses PK → followerPK          │
│  - Parses GSI1PK → followeePK      │
│  - Calculates delta (+1 or -1)     │
└──────┬─────────────────────────────┘
       │ Two parallel updates
       ▼
┌────────────────────────────────────┐
│  DynamoDB UpdateCommand            │
│  1. UPDATE USER#{followerId}       │
│     SET followingCount += 1        │
│                                    │
│  2. UPDATE USER#{followeeId}       │
│     SET followersCount += 1        │
└────────────────────────────────────┘
```

## 4. Profile Page Load

```
┌─────────────┐
│   Browser   │
│ Navigate to │
│ /profile/X  │
└──────┬──────┘
       │ GET /profile/{handle}
       ▼
┌────────────────────────────────────┐
│  ProfilePage Component             │
│  - Calls profileService            │
│    .getProfileByHandle()           │
└──────┬─────────────────────────────┘
       │ GET /profile/{handle}
       ▼
┌────────────────────────────────────┐
│  get-profile.ts Handler            │
│  - Fetches profile from DynamoDB   │
│  - Checks follow status (if auth)  │
└──────┬─────────────────────────────┘
       │ Query DynamoDB
       ▼
┌────────────────────────────────────┐
│  ProfileService.getProfileByHandle │
│  - Returns profile with counts     │
│    from PROFILE record             │
└──────┬─────────────────────────────┘
       │ Returns profile object
       ▼
┌────────────────────────────────────┐
│  ProfilePage Component             │
│  - Displays followersCount         │
│  - Displays followingCount         │
│  - Shows FollowButton with         │
│    initialIsFollowing,             │
│    initialFollowersCount           │
└────────────────────────────────────┘
```

## Current Problem: Missing Updates

**Issue**: Stream processor starts with `ShardIteratorType: 'LATEST'`
- ❌ Only processes events **created AFTER** processor starts
- ❌ Misses all historical follow events (like fikuruw's 3 follows)
- ❌ Profile counts remain at 0

**Evidence**:
1. fikuruw followed 3 users at 22:07:04, 22:07:08, 22:07:12
2. Stream processor likely started BEFORE or AFTER these events
3. DynamoDB has 3 FOLLOW records ✅
4. Profile shows `followingCount: 0` ❌
5. Logs show "✅ Found 1 stream record(s)" but no success messages

**Solution Options**:

### Option A: Reprocess Historical Events
Change `ShardIteratorType` from `'LATEST'` to `'TRIM_HORIZON'` to process all stream records from the beginning.

### Option B: Manual Count Repair
Run a script to scan all FOLLOW records and update profile counts.

### Option C: Trigger New Events
Unfollow and re-follow to generate new stream events that processor will catch.

## Data Flow Summary

1. **Write Path** (Follow Action):
   - User clicks Follow
   - Optimistic UI: count +1 immediately
   - API creates FOLLOW record in DynamoDB
   - Returns hardcoded 0s (intentional)
   - UI keeps optimistic +1

2. **Stream Processing** (Async):
   - DynamoDB Stream emits INSERT event
   - StreamProcessor polls every 2s
   - follow-counter.ts updates profile counts
   - **PROBLEM**: Only processes events after startup

3. **Read Path** (Profile Load):
   - User navigates to profile
   - Fetches PROFILE record from DynamoDB
   - Returns current followerCount/followingCount
   - **PROBLEM**: Counts are 0 because stream never updated them

## Timeline of fikuruw's Follows

```
22:07:04 - Follow #1 created → Stream record emitted
22:07:08 - Follow #2 created → Stream record emitted
22:07:12 - Follow #3 created → Stream record emitted
22:XX:XX - Stream processor started (LATEST mode)
         → Missed all 3 events!
```

**Conclusion**: The architecture is correct, but the stream processor's `LATEST` iterator type causes it to miss historical events. Need to either:
1. Use `TRIM_HORIZON` to process from beginning
2. Manually repair counts
3. Generate new events
