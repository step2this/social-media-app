# Pothos Plugin Migration Checklist

**Started:** 2025-11-10
**Branch:** claude/resolve-all-issues-011CUzNmYWQpCnjRyMhnH6RP

---

## Phase 0: Setup & Validation ✅

- [x] Git branch created
- [x] Baseline tests run (382+ tests documented)
- [x] Performance baseline documented
  - Build time: ~1600ms
  - server.js: 38.72 KB
  - lambda.js: 108.94 KB
  - standalone-server.js: 106.85 KB
- [x] Schema snapshot created (426 lines)
- [x] Migration checklist created

**Status:** ✅ Phase 0 Complete (2025-11-10)

---

## Phase 1: Complexity Plugin

**Estimated Time:** 1-2 days
**Dependencies:** @pothos/plugin-complexity

### Steps
- [ ] Install @pothos/plugin-complexity
- [ ] Update builder.ts with complexity plugin
- [ ] Configure complexity limits (complexity: 1000, depth: 10, breadth: 50)
- [ ] Add per-field complexity (optional)
- [ ] Remove old validation rules from server files
- [ ] Remove graphql-validation-complexity dependency
- [ ] Remove graphql-depth-limit dependency
- [ ] Create complexity.test.ts
- [ ] Run all tests (ensure no regressions)
- [ ] Performance validation (compare to baseline)
- [ ] Commit changes

### Success Criteria
- [ ] All tests pass
- [ ] Complex queries rejected
- [ ] Depth limits enforced
- [ ] Build time within 10% of baseline
- [ ] Old dependencies removed

**Status:** ⏳ Pending

---

## Phase 2: Relay Plugin

**Estimated Time:** 3-4 days
**Dependencies:** @pothos/plugin-relay

### Steps
- [ ] Install @pothos/plugin-relay
- [ ] Update builder.ts with relay plugin
- [ ] Create Node interface (interfaces/node.ts)
- [ ] Migrate Post type to implement Node
- [ ] Create posts connection query
- [ ] Update GetPosts use case for cursor pagination
- [ ] Test forward pagination (first/after)
- [ ] Test backward pagination (last/before)
- [ ] Test node(id:) query

### Connections to Migrate
- [ ] Posts connection
- [ ] Comments connection
- [ ] Notifications connection
- [ ] Auctions connection
- [ ] User's posts connection (Profile.posts field)

### Cleanup
- [ ] Remove CursorCodec.ts
- [ ] Remove ConnectionBuilder.ts
- [ ] Update pagination type exports
- [ ] Create relay-pagination.test.ts
- [ ] Run all tests
- [ ] Performance validation
- [ ] Commit changes

### Success Criteria
- [ ] All connections return proper Relay format
- [ ] Forward pagination works
- [ ] Backward pagination works
- [ ] Cursors are opaque (base64)
- [ ] node(id:) query works
- [ ] No N+1 queries
- [ ] Bundle size within 10% of baseline

**Status:** ⏳ Pending

---

## Phase 3: Dataloader Plugin

**Estimated Time:** 3-4 days
**Dependencies:** @pothos/plugin-dataloader

### Steps
- [ ] Install @pothos/plugin-dataloader
- [ ] Update builder.ts with dataloader plugin
- [ ] Convert Profile to loadableObject
- [ ] Convert LikeStatus to loadableObject
- [ ] Update Post.author field to use loader
- [ ] Update Post.likeStatus field to use loader
- [ ] Remove manual DataLoader factory (dataloaders/index.ts)
- [ ] Update context.ts (remove loaders)
- [ ] Update GraphQLContext type
- [ ] Update all field resolvers using loaders

### Loaders to Migrate
- [ ] profileLoader → Profile loadableObject
- [ ] postLoader → Post loadableObject
- [ ] likeStatusLoader → LikeStatus loadableObject
- [ ] auctionLoader → Auction loadableObject

### Testing
- [ ] Create dataloader.test.ts
- [ ] Test N+1 prevention (single batched query)
- [ ] Test request-scoped caching
- [ ] Run all tests
- [ ] Performance validation
- [ ] Commit changes

### Success Criteria
- [ ] All field resolvers simplified
- [ ] N+1 tests pass
- [ ] Request-scoped caching works
- [ ] No performance regression
- [ ] Old dataloader factory removed

**Status:** ⏳ Pending

---

## Phase 4: Tracing Plugin

**Estimated Time:** 2-3 days
**Dependencies:** @pothos/plugin-tracing, @pothos/plugin-tracing-opentelemetry (optional)

### Steps
- [ ] Install @pothos/plugin-tracing
- [ ] Install @pothos/plugin-tracing-opentelemetry (optional)
- [ ] Update builder.ts with tracing plugin
- [ ] Configure tracing wrapper
- [ ] Add logger to GraphQLContext
- [ ] Update context.ts with logger
- [ ] Test resolver timing logs
- [ ] Test slow resolver detection (>100ms)
- [ ] (Optional) Configure OpenTelemetry
- [ ] Create tracing.test.ts
- [ ] Run all tests
- [ ] Validate structured logs
- [ ] Commit changes

### Success Criteria
- [ ] All resolver executions traced
- [ ] Slow resolvers logged (>100ms)
- [ ] Root queries/mutations always logged
- [ ] Correlation IDs flow through traces
- [ ] OpenTelemetry spans created (if enabled)
- [ ] No performance regression

**Status:** ⏳ Pending

---

## Post-Migration Cleanup

**Estimated Time:** 1-2 days

### Code Cleanup
- [ ] Remove src/infrastructure/pagination/ directory
- [ ] Remove src/dataloaders/index.ts
- [ ] Remove old tests (cursor-codec, connection-builder)
- [ ] Update README with new architecture
- [ ] Remove old dependencies from package.json
- [ ] Final bundle size check

### Documentation
- [ ] Update Pothos best practices guide
- [ ] Document plugin usage patterns
- [ ] Update team onboarding docs
- [ ] Create migration retrospective

### Validation
- [ ] Full test suite passes
- [ ] Performance within acceptable range
- [ ] No console warnings or errors
- [ ] Schema SDL identical (or documented changes)
- [ ] CI/CD pipeline updated if needed

**Status:** ⏳ Pending

---

## Metrics Tracking

### Baseline (Phase 0)
- Tests: 382+ tests
- Build time: ~1600ms
- server.js: 38.72 KB
- lambda.js: 108.94 KB
- standalone-server.js: 106.85 KB
- Schema lines: 426

### Phase 1 Results
- Tests: ___ (target: no regressions)
- Build time: ___ ms (target: <1760ms, +10%)
- Bundle sizes: ___ (target: within 10%)
- LOC removed: ~30 lines

### Phase 2 Results
- Tests: ___ (target: no regressions)
- Build time: ___ ms (target: <1760ms)
- Bundle sizes: ___ (target: within 10%)
- LOC removed: ~250 lines

### Phase 3 Results
- Tests: ___ (target: no regressions)
- Build time: ___ ms (target: <1760ms)
- Bundle sizes: ___ (target: within 10%)
- LOC removed: ~150 lines

### Phase 4 Results
- Tests: ___ (target: no regressions)
- Build time: ___ ms (target: <1760ms)
- Bundle sizes: ___ (target: within 10%)
- LOC removed: ~50 lines

### Final Results
- Total LOC removed: ~600+ lines (target)
- Final build time: ___ ms
- Final bundle sizes: ___
- Test coverage: ___ % (target: +10%)

---

## Rollback Record

### Phase 1 Rollback (if needed)
- Date: ___
- Reason: ___
- Commands: ___

### Phase 2 Rollback (if needed)
- Date: ___
- Reason: ___
- Commands: ___

### Phase 3 Rollback (if needed)
- Date: ___
- Reason: ___
- Commands: ___

### Phase 4 Rollback (if needed)
- Date: ___
- Reason: ___
- Commands: ___

---

## Notes & Observations

### Phase 0 Observations
- ✅ Test infrastructure is solid
- ✅ Build tooling (tsup) working well
- ⚠️ Some resolver tests failing (pre-existing issues)
- ⚠️ Integration tests need work (separate from migration)

### General Notes
- Migration is incremental - can stop at any phase
- Each phase independently valuable
- All phases have clear rollback procedures
- Focus on maintaining passing tests (avoid breaking what works)
