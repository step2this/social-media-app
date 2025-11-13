# Testing Guide - Next.js Migration

**Last Updated:** 2025-11-13

Quick guide for testing the Next.js app during development.

---

## Prerequisites

Make sure you have:
- Docker running (for LocalStack)
- pnpm installed
- Node.js 22+

---

## 1. Start Development Environment

### Terminal 1: Start Infrastructure
```bash
# Start LocalStack (DynamoDB, S3, Redis, Postgres)
pnpm run local:start

# Wait ~10 seconds for services to be ready
# Verify with:
pnpm run local:status
```

### Terminal 2: Start GraphQL Server
```bash
# Build workspace packages first (one time)
pnpm --filter=@social-media-app/shared build
pnpm --filter=@social-media-app/dal build
pnpm --filter=@social-media-app/auth-utils build

# Start GraphQL server
pnpm run dev:graphql
```

### Terminal 3: Start Next.js
```bash
# Start Next.js dev server
pnpm run dev:web
```

**Or start both together:**
```bash
# Terminal 1: Infrastructure
pnpm run local:start

# Terminal 2: Both servers
pnpm run dev:nextjs
```

---

## 2. Seed the Database

Open a **new terminal** and run:

```bash
# Seed with test data
pnpm run seed:local
```

This creates:
- Test users
- Test posts
- Test comments
- Test likes
- Test follows

---

## 3. Test the App

### Access the App
Open your browser: **http://localhost:3000**

### Test Flow

#### Step 1: Register a New User
1. Go to http://localhost:3000/register
2. Fill in the registration form:
   - Email: `test@example.com`
   - Password: `Password123!`
   - Username: `testuser`
   - Handle: `testuser`
   - Full Name: `Test User`
3. Click "Register"
4. You should be redirected to the home page

#### Step 2: View Posts on Explore Page
1. Click **"Explore"** in the sidebar
2. You should see all seeded posts
3. Each post shows:
   - Author info (avatar, username, handle)
   - Post caption
   - Post image (if available)
   - Like count and comment count
   - Action buttons (like, comment, share)

#### Step 3: Test Like Functionality ⭐ NEW
1. Find a post on the Explore page
2. Click the **heart icon** (favorite_border)
3. **Expected behavior:**
   - Heart fills immediately (optimistic update)
   - Heart turns red
   - Like count increases by 1
   - No page reload or loading spinner
4. Click the heart again to unlike:
   - Heart empties (outline)
   - Color returns to gray
   - Like count decreases by 1

#### Step 4: Test Navigation
1. Click on a username/handle to view profile (placeholder page)
2. Click on a post image to view post detail (placeholder page)
3. Click "Home" to see your following feed (empty if you don't follow anyone)
4. Click "Explore" to see all posts again

---

## 4. Common Issues

### Issue: "No posts yet!"

**Problem:** Database not seeded or GraphQL server not running

**Solution:**
```bash
# Check GraphQL server is running on port 4000
curl http://localhost:4000/graphql

# Re-seed database
pnpm run seed:local
```

---

### Issue: "Failed to load feed"

**Problem:** GraphQL server not running or not accessible

**Solution:**
```bash
# Check if GraphQL server is running
lsof -ti:4000

# Restart GraphQL server
pnpm run dev:graphql
```

---

### Issue: Likes don't persist after page refresh

**Problem:** This is expected during development if you're not authenticated properly

**Solution:**
- Make sure you're logged in
- Check browser console for errors
- Check Network tab for failed GraphQL requests

---

### Issue: "JWT_SECRET not set" warning

**Problem:** Missing JWT secret in environment

**Solution:**
Create `.env.local` in project root:
```bash
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

---

## 5. Debugging

### Check Services Status
```bash
# Check all ports
pnpm run port:status

# Check LocalStack
pnpm run local:status

# Check Docker containers
docker ps
```

### View Logs
```bash
# LocalStack logs
pnpm run local:logs

# GraphQL server logs
# (visible in terminal where you ran dev:graphql)
```

### Clear Everything and Restart
```bash
# Stop all services
pnpm run servers:stop

# Clear ports
pnpm run port:clear

# Start fresh
pnpm run local:start
pnpm run dev:nextjs
```

---

## 6. Testing Checklist

### Authentication
- [ ] Can register new user
- [ ] Can login with existing user
- [ ] Can logout
- [ ] Protected routes redirect when not logged in
- [ ] Middleware works correctly

### Explore Page
- [ ] Shows all posts
- [ ] Posts load correctly with images
- [ ] Author info displays
- [ ] Like counts are accurate
- [ ] Comment counts are accurate

### Like Functionality
- [ ] Can like a post
- [ ] Heart fills and turns red immediately
- [ ] Like count increments
- [ ] Can unlike a post
- [ ] Unlike is instant
- [ ] Like count decrements
- [ ] Likes persist after page refresh
- [ ] Error handling works (if server fails)

### Navigation
- [ ] Sidebar navigation works
- [ ] Links are clickable
- [ ] Active link is highlighted
- [ ] Profile links work (even if placeholder)
- [ ] Post detail links work (even if placeholder)

---

## 7. GraphQL Playground

You can also test GraphQL queries directly:

**URL:** http://localhost:4000/graphql

### Example Query: Get Explore Feed
```graphql
query GetExploreFeed {
  exploreFeed(first: 10) {
    edges {
      node {
        id
        caption
        likesCount
        commentsCount
        author {
          username
          handle
        }
      }
    }
  }
}
```

### Example Mutation: Like Post
```graphql
mutation LikePost {
  likePost(postId: "post-id-here") {
    success
    message
  }
}
```

**Note:** You need to be authenticated. Add auth header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 8. Performance Testing

### Check Build Size
```bash
pnpm --filter=@social-media-app/web build
```

Current sizes:
- Feed page: ~1.14 KB
- Explore page: ~1.14 KB
- Shared JS: ~102 KB

### Check Load Time
1. Open DevTools
2. Go to Network tab
3. Clear cache
4. Reload page
5. Check "Load" time

**Target:** < 2 seconds for initial load

---

## 9. What to Test Next

Once Phase 5 continues:

### Comments (Coming Soon)
- [ ] View comments on post detail page
- [ ] Add comments
- [ ] Delete own comments

### Profile Pages (Coming Soon)
- [ ] View user profiles
- [ ] See user's posts
- [ ] Follow/unfollow users
- [ ] Edit own profile

### Post Creation (Coming Soon)
- [ ] Create post with caption
- [ ] Upload image to S3
- [ ] Preview before posting
- [ ] Redirect to feed after posting

---

## 10. Tips

### Fast Iteration
- Use `pnpm run dev:nextjs` for auto-reload
- Keep GraphQL server running (no need to restart)
- Use browser DevTools React extension

### Debugging GraphQL
- Check Network tab for GraphQL requests
- Look for 401 (auth) or 500 (server) errors
- Use GraphQL Playground for direct testing

### Resetting Data
```bash
# Clear DynamoDB tables
docker-compose -f docker-compose.local.yml down -v
docker-compose -f docker-compose.local.yml up -d

# Re-seed
pnpm run seed:local
```

---

## Quick Commands Reference

```bash
# Start everything
pnpm run local:start && pnpm run dev:nextjs

# Seed database
pnpm run seed:local

# Check status
pnpm run servers:status

# Clear and restart
pnpm run reset && pnpm run local:start && pnpm run dev:nextjs

# Build for production
pnpm run build:web

# Run tests
pnpm run test:web
```

---

**Happy Testing! 🚀**

If you find issues, check:
1. GraphQL server logs
2. Browser console
3. Network tab in DevTools
4. LocalStack status (`pnpm run local:status`)
