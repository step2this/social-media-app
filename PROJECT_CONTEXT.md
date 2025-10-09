# Social Media App Stream Processor Implementation

## 1. Project Overview
- Social media app with LocalStack development environment
- Event-sourced materialized views via DynamoDB Streams
- Profile stats (followers, following, posts) were showing 0 in development
- Goal: Fix profile stats with Test-Driven Development (TDD) approach

## 2. Current Implementation Status
- **Status**: ✅ Stream processor fully implemented AND WORKING
- **Tests**: 11/11 tests passing
- **Integration**: Complete with server.js
- **Startup**: Sequential startup script fixes timing issues
- **Verification**: ✅ Follow/unfollow functionality tested and working
- **Profile Stats**: ✅ Automatically update via DynamoDB Streams

## 3. Design Decisions
### Key Principles
- TDD Approach: Disciplined, prevent thrashing
- Dev/Prod Parity: Consistent stream processing
- Error Isolation: Individual handler failures don't cascade
- Polling Strategy: 2-second intervals with shard iterator management

## 4. Technical Solutions
- **LocalStack Region Fix**: Added `--region us-east-1` parameter
- **Timing Race Condition**: Sequential server startup
- **Persistence Volume**: Cleanup of cached stream ARNs
- **Stream Discovery**: Dynamic table metadata querying
- **Handler Registration**: Dynamic import for follow/like counters

## 5. Created/Modified Files
### New Files
- `/packages/backend/src/local-dev/stream-processor.ts`
- `/packages/backend/src/local-dev/stream-processor.test.ts`
- `/scripts/start-dev-sequential.sh`

### Modified Files
- `/packages/backend/server.js`
- `/.localstack/init.sh`
- `/package.json`
- `/scripts/cleanup-dev.sh`
- `/packages/backend/package.json`

## 6. Commits Overview
1. `96f0f41`: Fix LocalStack init script region parameter
2. `dcffa81`: Add sequential startup script
3. `bfaa071`: Clear LocalStack persistence volume on cleanup
4. `305d10c`: Fix DynamoDB Streams for LocalStack and follow counter

## 7. Development Environment
- **Ports**:
  - LocalStack: 4566
  - Backend: 3001
  - Frontend: 3000

## 8. Testing Strategy
- Stream processor polls every 2 seconds
- Handles follow-counter and like-counter Lambda handlers
- Error isolation prevents cascade failures
- 11 unit tests with mocked AWS SDK
- End-to-end service verification

## 9. Bugs Fixed
1. **LocalStack Streams Creation**: LocalStack has a bug where `update-table` to enable streams doesn't work. The stream ARN appears in table metadata but the stream doesn't exist in DynamoDB Streams service. Fixed by creating table with `--stream-specification` from the start.
2. **Follow Counter Handler**: Handler was checking for non-existent `entityType` field and wrong GSI. Fixed to check SK pattern and use correct GSI1PK.
3. **Stream Processor Logging**: Added debug logging to help diagnose stream processing issues.

## 10. Verification Steps
1. ✅ Stream processor initializes without errors
2. ✅ Follow increments followingCount (+1) and followersCount (+1)
3. ✅ Unfollow decrements followingCount (-1) and followersCount (-1)
4. ✅ Profile stats update automatically within 2 seconds
5. ⏭️ Next: Test like/unlike functionality

## 11. Key Technical Patterns
- TDD (RED-GREEN-REFACTOR)
- AWS SDK Mocking with Vitest
- DynamoDB Stream record transformation
- Graceful process shutdown
- Minimal Lambda context compatibility

## 12. Critical Development Notes
- NEVER use background processes (`&`)
- Always use `pnpm` scripts for server management
- Use `pnpm reset` for environment cleanup
- Maintain dev/prod parity
