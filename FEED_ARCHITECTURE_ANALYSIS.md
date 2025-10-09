# Social Media Feed Architecture: Fan-Out Patterns Analysis

## Executive Summary

This document analyzes different feed architecture patterns for a social media application, comparing "Fan-Out on Read" (query-time) vs "Fan-Out on Write" (materialized views) approaches. Written for technical interviews and system design discussions.

---

## Table of Contents

1. [Pattern Overview](#pattern-overview)
2. [Cost-Benefit Analysis](#cost-benefit-analysis)
3. [The Celebrity Problem](#the-celebrity-problem)
4. [Recommended Implementation Strategy](#recommended-implementation-strategy)
5. [Interview Talking Points](#interview-talking-points)

---

## Pattern Overview

### Fan-Out on Read (Query-Time)

**How it works:**
1. User requests their feed
2. Backend queries: Get following list → Get posts from each followed user → Merge & sort
3. Return top N posts

**When to use:**
- Early-stage products (<10K users)
- Read-heavy but infrequent (weekly active users)
- Budget-constrained environments
- Need strong consistency

**Architecture:**
```
User Request → Get Following List (1 query)
              ↓
         Batch Get Posts from followed users (1-2 queries)
              ↓
         Sort & Filter in-memory
              ↓
         Return feed
```

**Pros:**
- ✅ Simple to implement and maintain
- ✅ Always returns fresh, consistent data
- ✅ No storage overhead for feed cache
- ✅ No write amplification
- ✅ Easy to debug and test (deterministic)
- ✅ Works well at small-medium scale

**Cons:**
- ❌ Latency increases with # of followings
- ❌ Read cost scales with follower count
- ❌ Potential N+1 query problem if not optimized
- ❌ Higher compute on read path

### Fan-Out on Write (Materialized Views)

**How it works:**
1. User creates a post
2. DynamoDB Stream triggers Lambda
3. Lambda fans out: Write post reference to each follower's materialized feed
4. User reads feed: Instant query from pre-computed feed

**When to use:**
- Large scale (100K+ users)
- Read-heavy with high frequency (daily active users)
- Latency is critical (<100ms requirement)
- Budget allows for write amplification

**Architecture:**
```
User Posts → DynamoDB Insert → DynamoDB Stream → Lambda Fan-Out
                                                        ↓
                                        Write to each follower's feed cache
                                                        ↓
                                        User reads: Single query (instant)
```

**Pros:**
- ✅ Ultra-low latency (<100ms for feed load)
- ✅ Reduced read costs for active users
- ✅ Better user experience (instant loading)
- ✅ Read performance independent of following count

**Cons:**
- ❌ Write amplification (1 post = N writes where N = follower count)
- ❌ Eventual consistency (feed updates are async)
- ❌ Complex deletion/update logic
- ❌ Fan-out storms when celebrities post
- ❌ Higher infrastructure complexity
- ❌ Storage overhead (though usually minimal)

### Hybrid Approach (Best of Both Worlds)

**How it works:**
1. Materialize top 25 most recent posts (hot data)
2. Fallback to query-time for older posts (cold data)
3. Use thresholds to avoid celebrity problem

**Architecture:**
```
Read Request → Check materialized cache (top 25)
                    ↓
              If more needed → Query-time for items 26+
                    ↓
              Merge results
```

**Optimizations:**
- Only materialize for users with <1,000 followers
- Cap materialized items at 25 per user
- TTL on feed items (expire after 7 days)
- Async queue (SQS) for fan-out instead of direct Lambda

---

## Cost-Benefit Analysis

### Scale Assumptions

**Current App:**
- Users: 15 seeded
- Posts per user: 3-8 (avg: 5.5)
- Total DynamoDB items: ~1,571
- Estimated followers/user: Low (new app)

**Future Scale Projections:**
- 1K users: Hobbyist app
- 10K users: Small startup
- 100K users: Growing startup
- 1M+ users: Scale-up company

### Write Amplification Mathematics

**Scenario: Single user posts new content**

| Follower Count | Query-Time Writes | Materialized Writes | Amplification Factor |
|----------------|-------------------|---------------------|---------------------|
| 10 followers | 1 WCU | 11 WCU | 11× |
| 100 followers | 1 WCU | 101 WCU | 101× |
| 1,000 followers | 1 WCU | 1,001 WCU | 1,001× |
| 10,000 followers | 1 WCU | 10,001 WCU | 10,001× |

**Observation:** Write amplification grows linearly with follower count.

### Storage Overhead Analysis

**Per-user materialized feed:**
- Top 25 posts × ~1KB per post reference = ~25KB per user
- 1,000 users = 25MB total
- 100,000 users = 2.5GB total
- 1,000,000 users = 25GB total

**Conclusion:** Storage cost is negligible (~$6/month for 1M users)

### AWS DynamoDB Pricing (us-east-1, On-Demand)

| Resource | Cost |
|----------|------|
| Write Request Units (WCU) | $1.25 per million |
| Read Request Units (RCU) | $0.25 per million |
| Storage | $0.25 per GB-month |
| Streams Read Requests | $0.02 per 100K |

### Real-World Cost Comparison

**Scenario: 10,000 daily posts, average 50 followers each**

| Metric | Query-Time | Materialized | Hybrid (Top 25) |
|--------|------------|--------------|----------------|
| Daily Writes | 10K WCU | 500K WCU | 250K WCU |
| Daily Reads | 500K RCU (N+1) | 10K RCU | 50K RCU |
| Stream Reads | 0 | 500K | 250K |
| Monthly Write Cost | $0.38 | $18.75 | $9.38 |
| Monthly Read Cost | $3.75 | $0.08 | $0.38 |
| Monthly Stream Cost | $0 | $0.10 | $0.05 |
| **Total Monthly Cost** | **$4.13** | **$18.93** | **$9.81** |

**Breakeven Point:** Materialized becomes cost-effective when:
- Read frequency > 50× write frequency
- Feed loads > 1M per day
- Latency requirements < 200ms

---

## The Celebrity Problem

### Problem Statement

**What happens when a user with 100K+ followers posts?**

Traditional fan-out on write:
1. 1 post = 100,000 DynamoDB writes
2. Lambda may timeout (30s max)
3. DynamoDB Stream may backlog
4. Partial failures create inconsistent state
5. Write throttling from burst capacity

### Real-World Examples

**Twitter (circa 2012):**
- Switched from fan-out on write to fan-out on read for celebrities
- Defined "celebrity" as >1M followers
- Regular users: Materialized timeline
- Celebrities: Query-time merge

**Instagram:**
- Hybrid approach with tiered user classes
- Priority queue for high-follower accounts
- Async fan-out with SQS/Kinesis
- Eventual consistency acceptable (social media context)

**Facebook:**
- Complex multi-tier architecture
- Real-time for close friends (materialized)
- Delayed batch for acquaintances
- Algorithmic ranking reduces need for complete fan-out

### Solution Strategies

#### 1. Threshold-Based Hybrid

```typescript
async handleNewPost(post, authorId) {
  const followerCount = await getFollowerCount(authorId);

  if (followerCount < 1000) {
    // Fan-out on write (materialized)
    await materializeFeedForFollowers(post);
  } else {
    // Fan-out on read (query-time)
    // Celebrity posts retrieved dynamically
    await markAsInfluencer(authorId);
  }
}
```

**Thresholds:**
- <1,000 followers: Full materialization
- 1,000-10,000 followers: Partial materialization (active users only)
- >10,000 followers: Query-time only

#### 2. Async Queue Fan-Out

```
Post Created → SQS Queue → Lambda Workers (parallel)
                                    ↓
                          Rate-limited fan-out
                                    ↓
                          Update feeds over 5-10 minutes
```

**Benefits:**
- No Lambda timeout (workers process in batches)
- Natural rate limiting
- Retry logic for failures
- Observability (queue depth metrics)

#### 3. Active User Optimization

Only fan-out to users who:
- Logged in within last 30 days
- Have feed refresh patterns

**Storage savings:** ~70% for typical social apps

#### 4. Time-Boxed Fan-Out

```typescript
async fanOutWithTimeout(post, followers, timeout = 5000) {
  const startTime = Date.now();
  const processed = [];

  for (const follower of followers) {
    if (Date.now() - startTime > timeout) {
      // Queue remaining for async processing
      await queueRemainingFollowers(followers.slice(processed.length));
      break;
    }
    await writeFeedItem(follower, post);
    processed.push(follower);
  }
}
```

---

## Recommended Implementation Strategy

### Phase 1: MVP (Current - 1K users)

**Pattern:** Query-Time (Fan-Out on Read)

**Implementation:**
```typescript
async getFollowingFeed(userId: string, limit: number = 25) {
  // 1. Get following list (1 DynamoDB query)
  const following = await this.followService.getFollowingList(userId);

  // 2. Batch query posts from followed users (1-2 queries)
  const posts = await this.batchQueryPostsFromUsers(following, limit * 2);

  // 3. Sort and filter in-memory
  return posts
    .filter(p => p.isPublic)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}
```

**Performance:** <200ms per feed load
**Cost:** <$5/month
**Complexity:** Low (easy to test and debug)

### Phase 2: Growth (10K users)

**Pattern:** Hybrid with Top 25 Materialization

**Implementation:**
```typescript
async getFollowingFeed(userId: string, limit: number = 25) {
  // Try materialized cache first
  const cached = await this.getMaterializedFeed(userId, limit);

  if (cached.length >= limit) {
    return cached; // Cache hit - instant return
  }

  // Cache miss or need more - fallback to query
  const fromQuery = await this.queryTimeFeed(userId, limit - cached.length);

  // Merge and sort
  return [...cached, ...fromQuery]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}
```

**Stream Processor:**
```typescript
export const feedFanOutHandler = async (event: DynamoDBStreamEvent) => {
  for (const record of event.Records) {
    if (record.eventName === 'INSERT' && isPostEntity(record)) {
      const post = extractPost(record);
      const author = post.userId;

      // Get follower count
      const followerCount = await getFollowerCount(author);

      if (followerCount < 1000) {
        // Fan-out for non-celebrities
        await fanOutToFollowers(post);
      }
      // Else: Celebrity, query-time only
    }
  }
};
```

### Phase 3: Scale (100K+ users)

**Pattern:** Full Hybrid with SQS Queue

**Components:**
1. DynamoDB Stream → SQS Queue
2. Lambda workers process queue in batches
3. Materialized for <10K followers
4. Query-time for celebrities
5. Active user filtering
6. TTL on feed items (7 days)

---

## Interview Talking Points

### System Design Discussion Flow

**1. Requirements Clarification**
- "How many users? Daily active users?"
- "What's the read/write ratio?"
- "Acceptable latency for feed load?"
- "Are we optimizing for cost or performance?"

**2. High-Level Design**
- Start with simple query-time approach
- Explain trade-offs clearly
- Show understanding of scale implications
- Mention both patterns exist

**3. Deep Dive**
- Calculate write amplification
- Discuss celebrity problem
- Propose hybrid solution
- Show async processing knowledge

**4. Bottlenecks & Scaling**
- DynamoDB hot partitions
- Lambda concurrency limits
- Stream processing delays
- Cache invalidation strategies

### Common Interview Questions & Answers

**Q: "How would you design Twitter's feed?"**

A: "I'd use a hybrid approach:
- Regular users (<1K followers): Fan-out on write with materialized timelines
- Power users (1K-10K): Partial materialization with active user filtering
- Celebrities (>10K): Query-time merging
- Use SQS for async fan-out to prevent Lambda timeouts
- Implement TTL to manage storage costs
- Monitor with CloudWatch and adjust thresholds based on metrics"

**Q: "Your feed is slow. How do you optimize?"**

A: "First, measure:
1. Add CloudWatch metrics for each step
2. Identify bottleneck (query time vs processing)
3. Options:
   - Add caching layer (Redis) for following list
   - Materialize top 25 posts per user
   - Use DynamoDB DAX for hot reads
   - Batch queries more efficiently
   - Add pagination to reduce payload
4. A/B test changes with metrics"

**Q: "How do you handle eventual consistency?"**

A: "Social feeds can tolerate eventual consistency:
1. Set user expectations (feed may take 1-2s to update)
2. Implement read-after-write consistency for own posts
3. Use version numbers to prevent stale data
4. Show loading indicators during updates
5. Optimistic UI updates (show immediately, confirm async)
6. DynamoDB Streams guarantee delivery (at-least-once)"

**Q: "What if DynamoDB Stream processing fails?"**

A: "Multiple safety nets:
1. Lambda auto-retries (2 attempts by default)
2. DLQ (Dead Letter Queue) for failed events
3. Stream retention (24 hours) allows replay
4. CloudWatch alarms on processing errors
5. Fallback to query-time if materialized data missing
6. Idempotent handlers to allow safe retries"

---

## Implementation Checklist

### Query-Time Feed (Phase 1)

- [ ] `FollowService.getFollowingList()` - Get users followed by current user
- [ ] `PostService.batchQueryPostsFromUsers()` - Efficient batch retrieval
- [ ] `PostService.getFollowingFeed()` - Main feed orchestration
- [ ] Backend handler: `GET /feed/following` (auth required)
- [ ] Frontend: `feedService.getFollowingFeed()`
- [ ] Frontend: `HomePage` component with infinite scroll
- [ ] Unit tests for all layers
- [ ] Integration tests for feed pipeline
- [ ] Performance benchmarks (<200ms target)

### Materialized Feed (Phase 2)

- [ ] `FeedItemEntity` schema with TTL
- [ ] Stream processor: `feed-fanout-handler.ts`
- [ ] `FeedService.getMaterializedFeed()` - Read from cache
- [ ] `FeedService.writeFeedItem()` - Write to cache
- [ ] Celebrity detection logic (follower threshold)
- [ ] Hybrid fallback mechanism
- [ ] Queue-based fan-out (optional)
- [ ] CloudWatch dashboards
- [ ] Cost monitoring alerts
- [ ] Performance comparison metrics

---

## Performance Benchmarks

### Expected Latencies (P95)

| Approach | Following Count | Latency | Cost/Request |
|----------|----------------|---------|--------------|
| Query-Time | 50 | 150ms | $0.0002 |
| Query-Time | 100 | 250ms | $0.0004 |
| Query-Time | 500 | 800ms | $0.0015 |
| Materialized | Any | 50ms | $0.00003 |
| Hybrid | Any | 75ms | $0.0001 |

### DynamoDB Capacity Planning

**Query-Time Feed:**
- Following list query: 1 RCU (4KB data)
- Posts query: 2-5 RCU (depends on filter)
- Total: ~6 RCU per feed request
- 1M requests/day = 6M RCU = $1.50/day

**Materialized Feed:**
- Write: 50 WCU per post (50 followers avg)
- Read: 1 RCU per feed request
- 10K posts/day = 500K WCU = $0.63/day
- 1M reads/day = 1M RCU = $0.25/day

---

## Conclusion

**Key Takeaways:**

1. **Start Simple:** Query-time is perfectly acceptable for <10K users
2. **Measure First:** Optimize based on data, not assumptions
3. **Hybrid Wins:** Best performance/cost balance at scale
4. **Celebrity Problem:** Real issue requiring special handling
5. **Trade-offs Matter:** No perfect solution, context-dependent

**Best Practice:** Build for today, design for tomorrow. Start with query-time, add materialization when metrics justify the complexity.

---

**Author's Note:** This analysis was created during the development of TamaFriends, a social media application built to explore system design patterns for technical interviews.

**Last Updated:** October 2025
