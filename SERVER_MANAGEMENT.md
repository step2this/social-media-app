# Server Management Guide

**Last Updated:** 2025-10-11
**Status:** This is the authoritative guide for starting, stopping, and restarting servers in this project.

## 🚀 Quick Reference

| Task | Command | When to Use |
|------|---------|-------------|
| **Start Everything** | `pnpm dev` | First start of the day |
| **Restart Everything** | `pnpm quick:localstack` | When things are broken |
| **Stop Everything** | `pnpm servers:stop` | End of work session |
| **Check Server Status** | `lsof -ti:3000 && lsof -ti:3001` | When confused about what's running |
| **Emergency Cleanup** | `pnpm reset` | When nothing else works |

---

## 📋 Standard Workflows

### Starting Fresh (Recommended Daily Workflow)

```bash
# 1. Start everything with LocalStack
pnpm dev

# This runs sequentially:
# - Starts LocalStack (creates DynamoDB tables with streams)
# - Builds and starts backend (port 3001) with stream processor
# - Starts frontend (port 3000)
```

**What you'll see:**
- ✅ "Stream processor started - profile stats will update automatically"
- Backend: http://localhost:3001
- Frontend: http://localhost:3000
- LocalStack: http://localhost:4566

### Restarting When Issues Occur

```bash
# ⚠️ DO NOT USE: pnpm servers:restart
# Reason: This causes LocalStack stream ARN issues

# ✅ USE THIS INSTEAD: Full reset with fresh LocalStack
pnpm quick:localstack

# This:
# - Stops all servers
# - Clears LocalStack persistence
# - Recreates tables with working streams
# - Starts backend with stream processor
# - Starts frontend
```

**Why?** LocalStack has a bug where stream ARNs become stale after restarts. A full reset avoids this issue.

### Stopping Servers

```bash
# Stop all development servers (frontend + backend + LocalStack)
pnpm servers:stop

# This runs:
# - pkill for node processes on ports 3000/3001/3002
# - docker-compose down for LocalStack
```

---

## 🔧 Available Commands

### Main Commands (Use These)

| Command | What It Does | Use Case |
|---------|--------------|----------|
| `pnpm dev` | Start LocalStack + backend + frontend sequentially | Daily development start |
| `pnpm quick:localstack` | Reset everything and start fresh with LocalStack | When restarting or troubleshooting |
| `pnpm servers:stop` | Stop all servers | End of work session |
| `pnpm reset` | Emergency cleanup (stops servers + clears ports) | When servers are in broken state |

### Advanced Commands (Rarely Needed)

| Command | What It Does | When to Use |
|---------|--------------|-------------|
| `pnpm dev:localstack` | Start with LocalStack only (manual sequence) | If `pnpm dev` has issues |
| `pnpm dev:mocks` | Start with MSW mocks (no LocalStack) | Frontend-only development |
| `pnpm switch:localstack` | Copy .env.local to .env | Already done by `pnpm dev` |
| `pnpm switch:mocks` | Copy .env.mocks to .env | Switch to mock mode |
| `pnpm local:start` | Start LocalStack container only | Testing LocalStack in isolation |
| `pnpm local:stop` | Stop LocalStack container only | Rarely needed |
| `pnpm local:restart` | Restart LocalStack container | ⚠️ Can cause stream issues |
| `pnpm port:clear` | Kill processes on ports 3000/3001 | When ports are stuck |

### Individual Server Commands (Rarely Needed)

| Command | What It Does | When to Use |
|---------|--------------|-------------|
| `pnpm dev:backend` | Start backend only (port 3001) | Debugging backend in isolation |
| `pnpm dev:frontend` | Start frontend only (port 3000) | Debugging frontend in isolation |

---

## 🚨 Important Rules

### ❌ DO NOT USE

**`pnpm servers:restart`** - This command causes LocalStack stream processor issues due to stale stream ARNs.

**Why it fails:**
1. LocalStack restores table metadata (including old stream ARN)
2. But doesn't restore the actual stream
3. Backend tries to connect to non-existent stream
4. Stream processor fails with: `ResourceNotFoundException: Stream ... was not found`

**Use `pnpm quick:localstack` instead.**

### ✅ ALWAYS USE

**`pnpm quick:localstack`** when restarting - This ensures:
- Fresh LocalStack environment
- Working DynamoDB Streams
- Stream processor connects successfully
- Counter updates work properly

---

## 🔍 Troubleshooting

### Problem: "Stream processor failed to start"

**Symptoms:**
```
❌ Failed to start stream processor: ResourceNotFoundException
   Profile stats will not update automatically
```

**Solution:**
```bash
pnpm quick:localstack
```

**Why:** LocalStack stream ARN is stale. Full reset required.

---

### Problem: Port Already in Use

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution:**
```bash
# Option 1: Stop everything properly
pnpm servers:stop

# Option 2: Clear specific port
pnpm port:clear

# Option 3: Manual cleanup
lsof -ti:3001 | xargs kill -9
```

---

### Problem: Frontend Can't Connect to Backend

**Check:**
```bash
# Backend running?
lsof -ti:3001

# Frontend running?
lsof -ti:3000

# LocalStack running?
docker ps --filter "name=localstack"
```

**Solution:**
```bash
# If any missing, restart everything
pnpm quick:localstack
```

---

### Problem: Database Empty After Restart

**Solution:**
```bash
# Re-seed the database
pnpm seed:local

# This creates:
# - 15 test users
# - ~80-90 posts
# - All with zero likes/follows/comments
```

---

### Problem: Changes Not Appearing (Stale Cache)

**For Frontend Changes:**
```bash
# Clear Vite cache
cd packages/frontend
rm -rf node_modules/.vite

# Restart frontend
pnpm dev:frontend
```

**For Backend Changes:**
```bash
# Rebuild backend
cd packages/backend
pnpm build

# Restart backend
pnpm dev:local
```

**For Shared Package Changes:**
```bash
# Rebuild shared
cd packages/shared
pnpm build

# Clear frontend cache and restart
cd ../frontend
rm -rf node_modules/.vite
pnpm dev:frontend
```

---

## 📊 Port Assignments

| Service | Port | URL |
|---------|------|-----|
| Frontend (Vite) | 3000 | http://localhost:3000 |
| Backend (Express) | 3001 | http://localhost:3001 |
| LocalStack | 4566 | http://localhost:4566 |

**These are fixed and should NEVER change.**

---

## 🧪 Seeding Data

### Seed LocalStack Database

```bash
pnpm seed:local
```

**Creates:**
- 15 users (handles like @foolishdecryption, @eldora_bosco)
- 80-90 posts across users
- All counters start at 0 (for testing follow/like/comment features)

**Seeded users use same faker seed (123)** so handles are consistent across reseeds.

---

## 🔄 Stream Processor Status

The backend includes a DynamoDB Stream processor that:
- Polls every 2 seconds
- Updates follower/following/like/comment counts
- Logs: `"✅ Found N stream record(s)"` or `"📭 No new records"`

**Success message on startup:**
```
✅ Stream processor started - profile stats will update automatically
```

**Failure message (requires restart):**
```
❌ Failed to start stream processor: ResourceNotFoundException
   Profile stats will not update automatically
```

**If you see the failure message, run: `pnpm quick:localstack`**

---

## 📝 Environment Files

| File | Purpose | Activated By |
|------|---------|--------------|
| `.env.local` | LocalStack configuration | `pnpm dev` or `pnpm switch:localstack` |
| `.env.mocks` | MSW mock configuration | `pnpm dev:mocks` or `pnpm switch:mocks` |
| `.env` | Active configuration (auto-generated) | Copied from above by switch commands |

**DO NOT edit `.env` directly** - it's overwritten by switch commands.

---

## 🎯 Recommended Workflow

### Morning Start

```bash
# Option 1: Start everything fresh
pnpm dev

# Option 2: If database was seeded yesterday
pnpm dev
# (data persists in .localstack/volume unless you reset)
```

### During Development

```bash
# Frontend changes: Auto-reload works
# Backend changes: Restart backend
cd packages/backend && pnpm build && cd ../.. && pnpm dev:backend

# Shared package changes: Rebuild and clear frontend cache
cd packages/shared && pnpm build
cd ../frontend && rm -rf node_modules/.vite
pnpm dev:frontend
```

### When Things Break

```bash
# Full reset (recommended)
pnpm quick:localstack

# If database is empty after reset
pnpm seed:local
```

### End of Day

```bash
# Stop everything
pnpm servers:stop

# Or just close terminal (servers will be stopped next time you start)
```

---

## 📚 Related Documentation

- **CLAUDE.md** - General coding guidelines and principles
- **README.md** - Project overview and setup
- **packages/backend/README.md** - Backend-specific documentation
- **packages/frontend/README.md** - Frontend-specific documentation

---

## ⚠️ Common Mistakes

### ❌ Using `pnpm servers:restart`
**Don't do this.** It causes LocalStack stream issues.
**Use:** `pnpm quick:localstack` instead.

### ❌ Starting servers manually with `node server.js`
**Don't do this.** Bypasses proper initialization.
**Use:** `pnpm dev` or `pnpm dev:backend`

### ❌ Running multiple `pnpm dev` commands
**Don't do this.** Creates port conflicts.
**Check first:** `lsof -ti:3000` and `lsof -ti:3001`

### ❌ Editing `.env` directly
**Don't do this.** It gets overwritten.
**Use:** Edit `.env.local` or `.env.mocks` and run switch command

---

## 🆘 Emergency Recovery

If everything is completely broken:

```bash
# 1. Nuclear reset
pnpm reset

# 2. Clean start
pnpm quick:localstack

# 3. Re-seed data
pnpm seed:local

# 4. Test in browser
open http://localhost:3000
```

**This should fix 99% of issues.**

---

## 📞 Getting Help

If servers still won't start:

1. **Check this guide first** - Most issues are covered above
2. **Check CLAUDE.md** - Contains additional troubleshooting
3. **Check terminal output** - Error messages are usually clear
4. **Try `pnpm reset` then `pnpm quick:localstack`** - Fixes most issues

---

**Last Verified:** 2025-10-11
**Verified Working:** Full reset with `pnpm quick:localstack` + stream processor
